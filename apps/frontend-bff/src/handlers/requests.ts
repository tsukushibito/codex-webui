import { toErrorResponse } from "../errors";
import { mapPendingRequestView, mapRequestDetail, mapRequestResponseResult } from "../mappings";
import type {
  RuntimeRequestDetailView,
  RuntimeRequestResponseResult,
  RuntimeThreadPendingRequestView,
} from "../runtime-types";
import { mapRuntimeJsonResult, readJsonBody, runtimeClient } from "./shared";

export async function getPendingRequest(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadPendingRequestView>(
      `/api/v1/threads/${threadId}/pending_request`,
    );

    return mapRuntimeJsonResult(result, (body) => mapPendingRequestView(body), {
      sessionNotFoundCode: "thread_not_found",
      threadId,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getRequestDetail(_request: Request, requestId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeRequestDetailView>(
      `/api/v1/requests/${requestId}`,
    );

    return mapRuntimeJsonResult(result, (body) => mapRequestDetail(body), {
      requestId,
      sessionNotFoundCode: "request_not_found",
    });
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

    return mapRuntimeJsonResult(result, (body) => mapRequestResponseResult(body), {
      requestId,
      sessionInvalidStateCode: "request_not_pending",
      sessionNotFoundCode: "request_not_found",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
