import { listThreads } from "../../../../../../src/handlers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await context.params;
  return listThreads(request, workspaceId);
}
