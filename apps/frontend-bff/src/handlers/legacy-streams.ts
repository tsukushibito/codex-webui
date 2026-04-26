import { toErrorResponse } from "../errors";
import { mapApprovalStreamEvent, mapEvent } from "../mappings/legacy";
import type {
  RuntimeApprovalStreamEventProjection,
  RuntimeSessionEventProjection,
} from "../runtime-types";
import { relaySse } from "./streams";

export async function getSessionStream(request: Request, sessionId: string) {
  try {
    return await relaySse<RuntimeSessionEventProjection, ReturnType<typeof mapEvent>>(
      request,
      `/api/v1/sessions/${sessionId}/stream`,
      mapEvent,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getApprovalStream(request: Request) {
  try {
    return await relaySse<
      RuntimeApprovalStreamEventProjection,
      ReturnType<typeof mapApprovalStreamEvent>
    >(request, "/api/v1/approvals/stream", mapApprovalStreamEvent);
  } catch (error) {
    return toErrorResponse(error);
  }
}
