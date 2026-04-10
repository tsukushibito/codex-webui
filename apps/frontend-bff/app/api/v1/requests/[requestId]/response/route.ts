import { postRequestResponse } from "../../../../../../src/handlers";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  return postRequestResponse(request, requestId);
}
