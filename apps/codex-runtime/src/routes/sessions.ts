import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { RuntimeError } from "../errors.js";
import {
  parseAcceptMessageInput,
  parseAssistantEventInput,
} from "../domain/sessions/message-input.js";
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

  app.get("/api/v1/sessions/:sessionId/messages", async (request) => {
    const params = request.params as { sessionId: string };
    const query = request.query as {
      limit?: number | string;
      sort?: "created_at" | "-created_at";
    };
    const limit =
      typeof query.limit === "string"
        ? Number.parseInt(query.limit, 10)
        : query.limit;

    return sessionService.listMessages(params.sessionId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      sort: query.sort,
    });
  });

  app.post("/api/v1/sessions/:sessionId/start", async (request) => {
    const params = request.params as { sessionId: string };
    return sessionService.startSession(params.sessionId);
  });

  app.post("/api/v1/sessions/:sessionId/messages", async (request, reply) => {
    const params = request.params as { sessionId: string };
    let payload;

    try {
      payload = parseAcceptMessageInput(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new RuntimeError(
          422,
          "message_content_invalid",
          "message request is invalid",
          {
            issues: error.issues,
          },
        );
      }

      throw error;
    }

    const message = await sessionService.acceptMessage(params.sessionId, payload);
    reply.code(202);
    return message;
  });

  app.post("/api/v1/sessions/:sessionId/assistant-events", async (request, reply) => {
    const params = request.params as { sessionId: string };
    let payload;

    try {
      payload = parseAssistantEventInput(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new RuntimeError(
          422,
          "message_content_invalid",
          "assistant event request is invalid",
          {
            issues: error.issues,
          },
        );
      }

      throw error;
    }

    const result =
      payload.event_type === "message.assistant.delta"
        ? await sessionService.ingestAssistantDelta(params.sessionId, payload)
        : await sessionService.applyAssistantMessageCompletion(params.sessionId, payload);

    reply.code(202);
    return result;
  });

  app.post("/api/v1/sessions/:sessionId/stop", async (request) => {
    const params = request.params as { sessionId: string };
    return sessionService.stopSession(params.sessionId);
  });
}
