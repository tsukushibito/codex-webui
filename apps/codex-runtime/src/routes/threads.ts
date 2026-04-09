import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { parseThreadInput, parseThreadResponse } from "../domain/threads/thread-input.js";
import type { ThreadService } from "../domain/threads/thread-service.js";
import { RuntimeError } from "../errors.js";

function parsePayload<T>(
  body: unknown,
  parser: (value: unknown) => T,
  code: string,
  message: string,
) {
  try {
    return parser(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new RuntimeError(422, code, message, {
        issues: error.issues,
      });
    }

    throw error;
  }
}

export async function registerThreadRoutes(app: FastifyInstance, threadService: ThreadService) {
  app.get("/api/v1/workspaces/:workspaceId/threads", async (request) => {
    const params = request.params as { workspaceId: string };
    return threadService.listThreads(params.workspaceId);
  });

  app.post("/api/v1/workspaces/:workspaceId/inputs", async (request, reply) => {
    const params = request.params as { workspaceId: string };
    const payload = parsePayload(
      request.body,
      parseThreadInput,
      "thread_input_invalid",
      "thread input request is invalid",
    );

    reply.code(202);
    return threadService.startThreadFromInput(params.workspaceId, payload);
  });

  app.get("/api/v1/threads/:threadId", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.getThread(params.threadId);
  });

  app.post("/api/v1/threads/:threadId/open", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.openThread(params.threadId);
  });

  app.get("/api/v1/threads/:threadId/view", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.getThreadView(params.threadId);
  });

  app.post("/api/v1/threads/:threadId/inputs", async (request, reply) => {
    const params = request.params as { threadId: string };
    const payload = parsePayload(
      request.body,
      parseThreadInput,
      "thread_input_invalid",
      "thread input request is invalid",
    );

    reply.code(202);
    return threadService.acceptThreadInput(params.threadId, payload);
  });

  app.post("/api/v1/threads/:threadId/interrupt", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.interruptThread(params.threadId);
  });

  app.get("/api/v1/threads/:threadId/feed", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.listThreadFeed(params.threadId);
  });

  app.get("/api/v1/threads/:threadId/timeline", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.listTimeline(params.threadId);
  });

  app.get("/api/v1/threads/:threadId/pending_request", async (request) => {
    const params = request.params as { threadId: string };
    return threadService.getThreadPendingRequest(params.threadId);
  });

  app.get("/api/v1/threads/:threadId/stream", async (request, reply) => {
    const params = request.params as { threadId: string };
    await threadService.getThread(params.threadId);

    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });
    reply.raw.write(": connected\n\n");

    const unsubscribe = threadService.subscribeThreadStream(params.threadId, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    request.raw.on("close", () => {
      unsubscribe();
      reply.raw.end();
    });
  });

  app.get("/api/v1/notifications/stream", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });
    reply.raw.write(": connected\n\n");

    const unsubscribe = threadService.subscribeNotifications((event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    request.raw.on("close", () => {
      unsubscribe();
      reply.raw.end();
    });
  });

  app.get("/api/v1/requests/:requestId", async (request) => {
    const params = request.params as { requestId: string };
    return threadService.getRequestDetail(params.requestId);
  });

  app.post("/api/v1/requests/:requestId/response", async (request) => {
    const params = request.params as { requestId: string };
    const payload = parsePayload(
      request.body,
      parseThreadResponse,
      "request_decision_invalid",
      "request response is invalid",
    );

    return threadService.respondToRequest(params.requestId, payload);
  });
}
