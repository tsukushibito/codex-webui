import { getApproval } from "../../../../../src/handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const { approvalId } = await context.params;
  return getApproval(request, approvalId);
}
