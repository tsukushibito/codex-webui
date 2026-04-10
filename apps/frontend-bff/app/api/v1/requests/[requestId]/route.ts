import { getRequestDetail } from "../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  return getRequestDetail(request, requestId);
}
