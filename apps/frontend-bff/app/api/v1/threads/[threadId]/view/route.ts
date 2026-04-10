import { getThreadView } from "../../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return getThreadView(request, threadId);
}
