import { listThreads } from "../../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await context.params;
  return listThreads(request, workspaceId);
}
