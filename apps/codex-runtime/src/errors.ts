export interface ErrorDetails {
  [key: string]: unknown;
}

export class RuntimeError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = "RuntimeError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function toErrorEnvelope(error: unknown) {
  if (error instanceof RuntimeError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? {},
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "internal_server_error",
        message: "unexpected runtime failure",
        details: {},
      },
    },
  };
}
