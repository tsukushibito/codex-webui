import { NextResponse } from "next/server";

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export class BffError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "BffError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (!candidate.error || typeof candidate.error !== "object") {
    return false;
  }

  const error = candidate.error as Record<string, unknown>;
  return typeof error.code === "string" && typeof error.message === "string";
}

export function errorResponse(statusCode: number, body: ErrorEnvelope) {
  return NextResponse.json(body, { status: statusCode });
}

export function toErrorResponse(error: unknown) {
  if (error instanceof BffError) {
    return errorResponse(error.statusCode, {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return errorResponse(500, {
    error: {
      code: "internal_server_error",
      message: "unexpected frontend-bff failure",
      details: {},
    },
  });
}
