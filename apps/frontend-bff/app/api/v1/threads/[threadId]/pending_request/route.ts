import { getPendingRequest } from "../../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return getPendingRequest(request, threadId);
}
