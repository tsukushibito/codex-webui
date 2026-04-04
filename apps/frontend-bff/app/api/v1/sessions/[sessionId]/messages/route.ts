import {
  listMessages,
  postMessage,
} from "../../../../../../src/handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  return listMessages(request, sessionId);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  return postMessage(request, sessionId);
}
