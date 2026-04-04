import { denyApproval } from "../../../../../../src/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const { approvalId } = await context.params;
  return denyApproval(request, approvalId);
}
