import { stopSession } from "../../../../../../src/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  return stopSession(request, sessionId);
}
