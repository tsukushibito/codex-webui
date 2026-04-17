import { getThreadView } from "../../../../../../src/handlers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await context.params;
  return getThreadView(request, threadId);
}
