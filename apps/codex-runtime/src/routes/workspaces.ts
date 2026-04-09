import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { WorkspaceSummary } from "../domain/workspaces/types.js";
import { parseCreateWorkspaceInput } from "../domain/workspaces/workspace-name.js";
import type { WorkspaceRegistry } from "../domain/workspaces/workspace-registry.js";
import { RuntimeError } from "../errors.js";

function toWorkspaceResource(workspace: WorkspaceSummary) {
  return {
    workspace_id: workspace.workspace_id,
    workspace_name: workspace.workspace_name,
    directory_name: workspace.directory_name,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
  };
}

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  workspaceRegistry: WorkspaceRegistry,
) {
  app.get("/api/v1/workspaces", async () => {
    const items = await workspaceRegistry.listWorkspaces();

    return {
      items: items.map(toWorkspaceResource),
      next_cursor: null,
      has_more: false,
    };
  });

  app.post("/api/v1/workspaces", async (request, reply) => {
    let payload;

    try {
      payload = parseCreateWorkspaceInput(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new RuntimeError(422, "workspace_name_invalid", "workspace request body is invalid", {
          issues: error.issues,
        });
      }

      throw error;
    }

    const workspace = await workspaceRegistry.createWorkspace(payload.workspace_name);
    reply.code(201);
    return toWorkspaceResource(workspace);
  });

  app.get("/api/v1/workspaces/:workspaceId", async (request) => {
    const params = request.params as { workspaceId: string };
    return toWorkspaceResource(await workspaceRegistry.getWorkspace(params.workspaceId));
  });
}
