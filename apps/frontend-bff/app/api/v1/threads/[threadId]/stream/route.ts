import { getThreadStream } from "../../../../../../src/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return getThreadStream(request, threadId);
}
