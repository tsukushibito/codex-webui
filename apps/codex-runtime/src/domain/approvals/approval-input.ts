import { z } from "zod";

const approvalCategorySchema = z.enum([
  "destructive_change",
  "external_side_effect",
  "network_access",
  "privileged_execution",
]);

const ingestApprovalRequestSchema = z.object({
  turn_id: z.string().trim().min(1, "turn id is required"),
  approval_category: approvalCategorySchema,
  summary: z.string().trim().min(1, "approval summary is required"),
  reason: z.string().trim().min(1, "approval reason is required"),
  operation_summary: z
    .string()
    .trim()
    .min(1, "approval operation summary must be a non-empty string")
    .optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  native_request_kind: z
    .string()
    .trim()
    .min(1, "native request kind is required")
    .default("approval_request"),
});

const resolveApprovalSchema = z.object({
  resolution: z.enum(["approved", "denied"]),
});

export function parseIngestApprovalRequestInput(input: unknown) {
  return ingestApprovalRequestSchema.parse(input);
}

export function parseResolveApprovalInput(input: unknown) {
  return resolveApprovalSchema.parse(input);
}
