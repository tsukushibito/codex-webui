import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { RuntimeError } from "../errors.js";
import { parseCreateWorkspaceInput } from "../domain/workspaces/workspace-name.js";
import { WorkspaceRegistry } from "../domain/workspaces/workspace-registry.js";

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  workspaceRegistry: WorkspaceRegistry,
) {
  app.get("/api/v1/workspaces", async () => {
    const items = await workspaceRegistry.listWorkspaces();

    return {
      items,
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
        throw new RuntimeError(
          422,
          "workspace_name_invalid",
          "workspace request body is invalid",
          {
            issues: error.issues,
          },
        );
      }

      throw error;
    }

    const workspace = await workspaceRegistry.createWorkspace(payload.workspace_name);
    reply.code(201);
    return workspace;
  });

  app.get("/api/v1/workspaces/:workspaceId", async (request) => {
    const params = request.params as { workspaceId: string };
    return workspaceRegistry.getWorkspace(params.workspaceId);
  });
}
