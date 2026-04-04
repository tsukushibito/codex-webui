import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { parseResolveApprovalInput } from "../domain/approvals/approval-input.js";
import { RuntimeError } from "../errors.js";
import { SessionService } from "../domain/sessions/session-service.js";

export async function registerApprovalRoutes(
  app: FastifyInstance,
  sessionService: SessionService,
) {
  app.get("/api/v1/approvals/summary", async () => {
    return sessionService.getApprovalSummary();
  });

  app.get("/api/v1/approvals", async (request) => {
    const query = request.query as {
      status?: "pending" | "approved" | "denied" | "canceled";
      workspace_id?: string;
      limit?: number | string;
      sort?: "created_at" | "-created_at";
    };
    const limit =
      typeof query.limit === "string"
        ? Number.parseInt(query.limit, 10)
        : query.limit;

    return sessionService.listApprovals({
      status: query.status,
      workspace_id: query.workspace_id,
      limit: Number.isFinite(limit) ? limit : undefined,
      sort: query.sort,
    });
  });

  app.get("/api/v1/approvals/:approvalId", async (request) => {
    const params = request.params as { approvalId: string };
    return sessionService.getApproval(params.approvalId);
  });

  app.post("/api/v1/approvals/:approvalId/resolve", async (request) => {
    const params = request.params as { approvalId: string };
    let payload;

    try {
      payload = parseResolveApprovalInput(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new RuntimeError(
          422,
          "approval_resolution_invalid",
          "approval resolution is invalid",
          {
            issues: error.issues,
          },
        );
      }

      throw error;
    }

    return sessionService.resolveApproval(params.approvalId, payload);
  });
}
