import { createWorkspace, listWorkspaces } from "../../../../src/handlers";

export async function GET(request: Request) {
  return listWorkspaces(request);
}

export async function POST(request: Request) {
  return createWorkspace(request);
}
