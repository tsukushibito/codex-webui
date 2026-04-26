import { isErrorEnvelope, toErrorResponse } from "../errors";
import { mapPendingRequestView, mapRequestDetail, mapRequestResponseResult } from "../mappings";
import type {
  RuntimeRequestDetailView,
  RuntimeRequestResponseResult,
  RuntimeThreadPendingRequestView,
} from "../runtime-types";
import { jsonResponse, passthroughRuntimeError, readJsonBody, runtimeClient } from "./shared";

export async function getPendingRequest(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadPendingRequestView>(
      `/api/v1/threads/${threadId}/pending_request`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        sessionNotFoundCode: "thread_not_found",
        threadId,
      });
    }

    return jsonResponse(result.status, mapPendingRequestView(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getRequestDetail(_request: Request, requestId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeRequestDetailView>(
      `/api/v1/requests/${requestId}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        requestId,
        sessionNotFoundCode: "request_not_found",
      });
    }

    return jsonResponse(result.status, mapRequestDetail(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postRequestResponse(request: Request, requestId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeRequestResponseResult>(
      `/api/v1/requests/${requestId}/response`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body, {
        requestId,
        sessionInvalidStateCode: "request_not_pending",
        sessionNotFoundCode: "request_not_found",
      });
    }

    return jsonResponse(result.status, mapRequestResponseResult(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
