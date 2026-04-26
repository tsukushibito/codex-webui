import { desc, eq } from "drizzle-orm";

import type { RuntimeDatabase } from "../../db/database.js";
import { approvals } from "../../db/schema.js";
import type { ApprovalProjection } from "../approvals/types.js";

export interface ThreadRequestRecord {
  request_id: string;
  thread_id: string;
  workspace_id: string;
  status: ApprovalProjection["status"];
  resolution: ApprovalProjection["resolution"];
  risk_classification: ApprovalProjection["approval_category"];
  summary: string;
  reason: string;
  operation_summary: string | null;
  context: Record<string, unknown> | null;
  requested_at: string;
  responded_at: string | null;
  request_kind: string;
}

export class ThreadRequestPersistence {
  constructor(private readonly database: RuntimeDatabase) {}

  listThreadRequests(threadId: string): ThreadRequestRecord[] {
    return this.database.db
      .select()
      .from(approvals)
      .where(eq(approvals.sessionId, threadId))
      .orderBy(desc(approvals.createdAt), desc(approvals.approvalId))
      .all()
      .map((row) => this.toThreadRequestRecord(row));
  }

  getRequestById(requestId: string): ThreadRequestRecord | null {
    const row =
      this.database.db
        .select()
        .from(approvals)
        .where(eq(approvals.approvalId, requestId))
        .limit(1)
        .all()[0] ?? null;

    return row ? this.toThreadRequestRecord(row) : null;
  }

  markRequestResolved(
    requestId: string,
    resolution: Extract<ThreadRequestRecord["status"], "approved" | "denied">,
    resolvedAt: string,
  ) {
    this.database.db
      .update(approvals)
      .set({
        status: resolution,
        resolution,
        resolvedAt,
      })
      .where(eq(approvals.approvalId, requestId))
      .run();
  }

  private toThreadRequestRecord(row: typeof approvals.$inferSelect): ThreadRequestRecord {
    return {
      request_id: row.approvalId,
      thread_id: row.sessionId,
      workspace_id: row.workspaceId,
      status: row.status as ApprovalProjection["status"],
      resolution: row.resolution as ApprovalProjection["resolution"],
      risk_classification: row.approvalCategory as ApprovalProjection["approval_category"],
      summary: row.summary,
      reason: row.reason,
      operation_summary: row.operationSummary,
      context: row.context === null ? null : (JSON.parse(row.context) as Record<string, unknown>),
      requested_at: row.createdAt,
      responded_at: row.resolvedAt,
      request_kind: row.nativeRequestKind,
    };
  }
}
