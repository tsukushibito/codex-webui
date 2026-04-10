import { postThreadInput } from "../../../../../../src/handlers";

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return postThreadInput(request, threadId);
}
