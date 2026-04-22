import { errorResponse } from "./errors";

type RetiredLegacyRouteFamily = "approvals" | "sessions";

const replacementEndpoints = [
  "/api/v1/workspaces/{workspace_id}/threads",
  "/api/v1/threads/{thread_id}",
  "/api/v1/threads/{thread_id}/view",
  "/api/v1/threads/{thread_id}/pending_request",
  "/api/v1/requests/{request_id}",
  "/api/v1/requests/{request_id}/response",
];

export function retiredLegacyRouteResponse(routeFamily: RetiredLegacyRouteFamily) {
  return errorResponse(410, {
    error: {
      code: "legacy_route_retired",
      message: `Legacy ${routeFamily} routes are retired; use v0.9 thread and request endpoints instead.`,
      details: {
        route_family: routeFamily,
        replacement_endpoints: replacementEndpoints,
      },
    },
  });
}
