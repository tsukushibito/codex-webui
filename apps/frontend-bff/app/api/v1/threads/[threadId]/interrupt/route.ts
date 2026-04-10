import { postThreadInterrupt } from "../../../../../../src/handlers";

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return postThreadInterrupt(request, threadId);
}
