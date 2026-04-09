import { getSession } from "../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  return getSession(request, sessionId);
}
