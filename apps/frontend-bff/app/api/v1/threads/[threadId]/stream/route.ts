import { getThreadStream } from "../../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return getThreadStream(request, threadId);
}
