import { isErrorEnvelope, toErrorResponse } from "../errors";
import {
  mapThread,
  mapThreadInputAcceptedResponse,
  mapThreadList,
  mapThreadView,
  mapTimeline,
} from "../mappings";
import type {
  ListResponse,
  RuntimeThreadInputAcceptedResponse,
  RuntimeThreadInterruptResponse,
  RuntimeThreadListResponse,
  RuntimeThreadSummary,
  RuntimeThreadViewHelper,
  RuntimeTimelineItem,
} from "../runtime-types";
import { runtimeThreadListResponseSchema } from "../runtime-types";
import {
  forwardSearch,
  jsonResponse,
  passthroughRuntimeError,
  readJsonBody,
  runtimeClient,
} from "./shared";

export async function listThreads(request: Request, workspaceId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadListResponse>(
      `/api/v1/workspaces/${workspaceId}/threads${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        sessionNotFoundCode: "thread_not_found",
      });
    }

    return jsonResponse(
      result.status,
      mapThreadList(runtimeThreadListResponseSchema.parse(result.body)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getThread(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadSummary>(
      `/api/v1/threads/${threadId}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    return jsonResponse(result.status, mapThread(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getThreadView(_request: Request, threadId: string) {
  try {
    const [viewResult, timelineResult] = await Promise.all([
      runtimeClient.requestJson<RuntimeThreadViewHelper>(`/api/v1/threads/${threadId}/view`),
      runtimeClient.requestJson<ListResponse<RuntimeTimelineItem>>(
        `/api/v1/threads/${threadId}/timeline`,
      ),
    ]);

    if (isErrorEnvelope(viewResult.body)) {
      return passthroughRuntimeError(viewResult.status, viewResult.body, {
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    if (isErrorEnvelope(timelineResult.body)) {
      return passthroughRuntimeError(timelineResult.status, timelineResult.body, {
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    return jsonResponse(viewResult.status, mapThreadView(viewResult.body, timelineResult.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getTimeline(request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeTimelineItem>>(
      `/api/v1/threads/${threadId}/timeline${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    return jsonResponse(result.status, mapTimeline(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postWorkspaceInput(request: Request, workspaceId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadInputAcceptedResponse>(
      `/api/v1/workspaces/${workspaceId}/inputs`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapThreadInputAcceptedResponse(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postThreadInput(request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadInputAcceptedResponse>(
      `/api/v1/threads/${threadId}/inputs`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        sessionInvalidStateCode: "thread_not_accepting_input",
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    return jsonResponse(result.status, mapThreadInputAcceptedResponse(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postThreadInterrupt(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadInterruptResponse>(
      `/api/v1/threads/${threadId}/interrupt`,
      {
        method: "POST",
        body: {},
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        sessionInvalidStateCode: "thread_not_interruptible",
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    return jsonResponse(result.status, mapThread(result.body.thread));
  } catch (error) {
    return toErrorResponse(error);
  }
}
