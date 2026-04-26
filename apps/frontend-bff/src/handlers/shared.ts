import { NextResponse } from "next/server";

import type { ErrorEnvelope } from "../errors";
import { isErrorEnvelope, toErrorResponse } from "../errors";
import { RuntimeClient } from "../runtime-client";

export const runtimeClient = new RuntimeClient();

export function forwardSearch(request: Request) {
  return new URL(request.url).search;
}

export async function readJsonBody(request: Request) {
  const text = await request.text();
  if (text.length === 0) {
    return {};
  }

  return JSON.parse(text) as unknown;
}

export function jsonResponse(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

export type ActiveRuntimeErrorMapping = {
  requestId?: string;
  sessionInvalidStateCode?: string;
  sessionNotFoundCode: string;
  threadId?: string;
};

export function normalizeActiveRuntimeErrorEnvelope(
  body: ErrorEnvelope,
  mapping: ActiveRuntimeErrorMapping,
): ErrorEnvelope {
  const details = { ...body.error.details };

  const sessionId =
    typeof details.session_id === "string"
      ? details.session_id
      : typeof mapping.threadId === "string"
        ? mapping.threadId
        : null;
  const currentStatus =
    typeof details.current_status === "string"
      ? details.current_status
      : typeof details.status === "string"
        ? details.status
        : null;

  if (body.error.code === "session_not_found") {
    if (mapping.sessionNotFoundCode === "request_not_found") {
      return {
        error: {
          code: "request_not_found",
          message: "request was not found",
          details: {
            ...(mapping.requestId ? { request_id: mapping.requestId } : {}),
            ...(typeof details.thread_id === "string"
              ? { thread_id: details.thread_id }
              : typeof sessionId === "string"
                ? { thread_id: sessionId }
                : {}),
          },
        },
      };
    }

    return {
      error: {
        code: "thread_not_found",
        message: "thread was not found",
        details: {
          ...(typeof details.thread_id === "string"
            ? { thread_id: details.thread_id }
            : typeof sessionId === "string"
              ? { thread_id: sessionId }
              : {}),
        },
      },
    };
  }

  if (body.error.code === "session_invalid_state" && mapping.sessionInvalidStateCode) {
    if (mapping.sessionInvalidStateCode === "request_not_pending") {
      return {
        error: {
          code: "request_not_pending",
          message: "request is not pending",
          details: {
            ...(mapping.requestId ? { request_id: mapping.requestId } : {}),
            ...(typeof details.thread_id === "string"
              ? { thread_id: details.thread_id }
              : typeof sessionId === "string"
                ? { thread_id: sessionId }
                : {}),
            ...(typeof currentStatus === "string" ? { status: currentStatus } : {}),
          },
        },
      };
    }

    return {
      error: {
        code: mapping.sessionInvalidStateCode,
        message:
          mapping.sessionInvalidStateCode === "thread_not_interruptible"
            ? "thread is not interruptible"
            : "thread is not accepting user input",
        details: {
          ...(typeof details.thread_id === "string"
            ? { thread_id: details.thread_id }
            : typeof sessionId === "string"
              ? { thread_id: sessionId }
              : {}),
          ...(typeof currentStatus === "string" ? { status: currentStatus } : {}),
          workspace_id: typeof details.workspace_id === "string" ? details.workspace_id : undefined,
          active_thread_id:
            typeof details.active_thread_id === "string"
              ? details.active_thread_id
              : typeof details.active_session_id === "string"
                ? details.active_session_id
                : undefined,
        },
      },
    };
  }

  if (body.error.code.startsWith("session_")) {
    const normalizedDetails = { ...details };
    if (typeof details.session_id === "string" && !("thread_id" in normalizedDetails)) {
      normalizedDetails.thread_id = details.session_id;
    }
    if (
      typeof details.active_session_id === "string" &&
      !("active_thread_id" in normalizedDetails)
    ) {
      normalizedDetails.active_thread_id = details.active_session_id;
    }
    delete normalizedDetails.session_id;
    delete normalizedDetails.active_session_id;

    return {
      error: {
        code: body.error.code.replace(/^session_/, "thread_"),
        message: body.error.message.replace(/\bsession\b/g, "thread"),
        details:
          typeof sessionId === "string" && !("thread_id" in normalizedDetails)
            ? { ...normalizedDetails, thread_id: sessionId }
            : normalizedDetails,
      },
    };
  }

  if ("session_id" in details || "active_session_id" in details) {
    const normalizedDetails = { ...details };
    if (typeof details.session_id === "string" && !("thread_id" in normalizedDetails)) {
      normalizedDetails.thread_id = details.session_id;
    }
    if (
      typeof details.active_session_id === "string" &&
      !("active_thread_id" in normalizedDetails)
    ) {
      normalizedDetails.active_thread_id = details.active_session_id;
    }
    delete normalizedDetails.session_id;
    delete normalizedDetails.active_session_id;

    if (mapping.requestId && !("request_id" in normalizedDetails)) {
      normalizedDetails.request_id = mapping.requestId;
    }

    return {
      error: {
        ...body.error,
        details: normalizedDetails,
      },
    };
  }

  return body;
}

export async function parseRuntimeErrorResponse(
  response: Response,
  mapping?: ActiveRuntimeErrorMapping,
) {
  try {
    const payload = await response.json();
    if (isErrorEnvelope(payload)) {
      return jsonResponse(
        response.status,
        mapping ? normalizeActiveRuntimeErrorEnvelope(payload, mapping) : payload,
      );
    }
  } catch {
    // fall through
  }

  return toErrorResponse(new Error("codex-runtime returned an invalid stream error response"));
}

export function passthroughRuntimeError(
  status: number,
  body: unknown,
  mapping?: ActiveRuntimeErrorMapping,
) {
  if (isErrorEnvelope(body)) {
    return jsonResponse(
      status,
      mapping ? normalizeActiveRuntimeErrorEnvelope(body, mapping) : body,
    );
  }

  throw new Error("expected runtime error envelope");
}

export function mapRuntimeJsonResult<TBody, TMapped>(
  result: { status: number; body: TBody | ErrorEnvelope },
  mapper: (body: TBody) => TMapped,
  mapping?: ActiveRuntimeErrorMapping,
) {
  if (isErrorEnvelope(result.body)) {
    return passthroughRuntimeError(result.status, result.body, mapping);
  }

  return jsonResponse(result.status, mapper(result.body));
}
