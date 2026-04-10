import { postWorkspaceInput } from "../../../../../../src/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  return postWorkspaceInput(request, workspaceId);
}
