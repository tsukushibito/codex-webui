import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { RuntimeError } from "../errors.js";
import { parseCreateSessionInput } from "../domain/sessions/session-title.js";
import { SessionService } from "../domain/sessions/session-service.js";

export async function registerSessionRoutes(
  app: FastifyInstance,
  sessionService: SessionService,
) {
  app.get("/api/v1/workspaces/:workspaceId/sessions", async (request) => {
    const params = request.params as { workspaceId: string };
    const items = await sessionService.listSessions(params.workspaceId);

    return {
      items,
      next_cursor: null,
      has_more: false,
    };
  });

  app.post("/api/v1/workspaces/:workspaceId/sessions", async (request, reply) => {
    const params = request.params as { workspaceId: string };
    let payload;

    try {
      payload = parseCreateSessionInput(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new RuntimeError(
          422,
          "session_title_invalid",
          "session title must be 1-200 non-empty characters",
          {
            issues: error.issues,
          },
        );
      }

      throw error;
    }

    const session = await sessionService.createSession(params.workspaceId, payload.title);
    reply.code(201);
    return session;
  });

  app.get("/api/v1/sessions/:sessionId", async (request) => {
    const params = request.params as { sessionId: string };
    return sessionService.getSession(params.sessionId);
  });

  app.post("/api/v1/sessions/:sessionId/start", async (request) => {
    const params = request.params as { sessionId: string };
    return sessionService.startSession(params.sessionId);
  });

  app.post("/api/v1/sessions/:sessionId/stop", async (request) => {
    const params = request.params as { sessionId: string };
    return sessionService.stopSession(params.sessionId);
  });
}
