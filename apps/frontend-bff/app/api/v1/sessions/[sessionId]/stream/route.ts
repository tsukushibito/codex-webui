import { getSessionStream } from "../../../../../../src/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  return getSessionStream(request, sessionId);
}
