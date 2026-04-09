import { createSession, listSessions } from "../../../../../../src/handlers";

export async function GET(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await context.params;
  return listSessions(request, workspaceId);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  return createSession(request, workspaceId);
}
