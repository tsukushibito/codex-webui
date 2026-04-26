import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { RuntimeDatabase } from "../../db/database.js";
import { messages, sessions, workspaces } from "../../db/schema.js";
import { RuntimeError } from "../../errors.js";
import type { NativeSessionGateway } from "../sessions/native-session-gateway.js";
import type { SessionEventPublisher } from "../sessions/session-event-publisher.js";
import type { MessageProjection } from "../sessions/types.js";

type TurnStartConvergenceGateway = NativeSessionGateway & {
  acknowledgeTurnStartPersisted?: (input: { sessionId: string; turnId: string }) => Promise<void>;
};

function generateMessageId() {
  return `msg_user_${crypto.randomUUID().replaceAll("-", "")}`;
}

function firstRow<T>(rows: T[]) {
  return rows[0] ?? null;
}

export class ThreadInputOrchestrator {
  constructor(
    private readonly database: RuntimeDatabase,
    private readonly sessionEventPublisher: SessionEventPublisher,
    private readonly nativeSessionGateway: NativeSessionGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async acceptThreadMessage(
    threadId: string,
    input: {
      client_message_id: string;
      content: string;
    },
  ): Promise<MessageProjection> {
    const existingMessage = firstRow(
      this.database.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.sessionId, threadId),
            eq(messages.clientMessageId, input.client_message_id),
          ),
        )
        .limit(1)
        .all(),
    );

    if (existingMessage) {
      if (existingMessage.content !== input.content) {
        throw new RuntimeError(
          409,
          "message_idempotency_conflict",
          "client message id conflicts with a different message payload",
          {
            session_id: threadId,
            client_message_id: input.client_message_id,
          },
        );
      }

      return {
        message_id: existingMessage.messageId,
        session_id: existingMessage.sessionId,
        role: existingMessage.role as MessageProjection["role"],
        content: existingMessage.content,
        created_at: existingMessage.createdAt,
        source_item_type: existingMessage.sourceItemType as MessageProjection["source_item_type"],
      };
    }

    const session = firstRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, threadId))
        .limit(1)
        .all(),
    );

    if (!session) {
      throw new RuntimeError(404, "session_not_found", "session was not found", {
        session_id: threadId,
      });
    }

    if (session.status !== "waiting_input") {
      throw new RuntimeError(
        409,
        "session_invalid_state",
        "session is not ready to accept messages",
        {
          session_id: threadId,
          current_status: session.status,
        },
      );
    }

    const nativeTurn = await this.nativeSessionGateway.sendUserMessage({
      sessionId: threadId,
      content: input.content,
    });
    const userMessageId = generateMessageId();
    const userCreatedAt = this.now().toISOString();

    try {
      this.database.sqlite.transaction(() => {
        this.database.db
          .insert(messages)
          .values({
            messageId: userMessageId,
            sessionId: threadId,
            role: "user",
            content: input.content,
            createdAt: userCreatedAt,
            sourceItemType: "user_message",
            clientMessageId: input.client_message_id,
          })
          .run();

        this.sessionEventPublisher.appendSessionEvent({
          sessionId: threadId,
          eventType: "message.user",
          occurredAt: userCreatedAt,
          payload: {
            message_id: userMessageId,
            content: input.content,
          },
        });

        this.database.db
          .update(sessions)
          .set({
            status: "running",
            updatedAt: userCreatedAt,
            lastMessageAt: userCreatedAt,
            currentTurnId: nativeTurn.turnId,
            pendingAssistantMessageId: null,
            appSessionOverlayState: "open",
          })
          .where(eq(sessions.sessionId, threadId))
          .run();

        this.database.db
          .update(workspaces)
          .set({
            updatedAt: userCreatedAt,
          })
          .where(eq(workspaces.workspaceId, session.workspaceId))
          .run();

        this.sessionEventPublisher.appendSessionStatusChangedEvent({
          sessionId: threadId,
          occurredAt: userCreatedAt,
          fromStatus: "waiting_input",
          toStatus: "running",
        });
      })();
      await this.acknowledgeTurnStartPersisted(threadId, nativeTurn.turnId);
    } catch (error) {
      try {
        this.markThreadRecoveryPending(
          threadId,
          session.workspaceId,
          userCreatedAt,
          nativeTurn.turnId,
        );
      } catch {
        // Keep the original post-native persistence failure as the primary error.
      }

      throw error;
    }

    return {
      message_id: userMessageId,
      session_id: threadId,
      role: "user",
      content: input.content,
      created_at: userCreatedAt,
      source_item_type: "user_message",
    };
  }

  private async acknowledgeTurnStartPersisted(sessionId: string, turnId: string) {
    await (
      this.nativeSessionGateway as TurnStartConvergenceGateway
    ).acknowledgeTurnStartPersisted?.({
      sessionId,
      turnId,
    });
  }

  private markThreadRecoveryPending(
    threadId: string,
    workspaceId: string,
    updatedAt: string,
    currentTurnId: string,
  ) {
    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          status: "running",
          updatedAt,
          lastMessageAt: updatedAt,
          currentTurnId,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "recovery_pending",
        })
        .where(eq(sessions.sessionId, threadId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt,
        })
        .where(eq(workspaces.workspaceId, workspaceId))
        .run();
    })();
  }
}
