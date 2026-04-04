import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  workspaceId: text("workspace_id").primaryKey(),
  workspaceName: text("workspace_name").notNull().unique(),
  directoryName: text("directory_name").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  activeSessionId: text("active_session_id"),
  pendingApprovalCount: integer("pending_approval_count").notNull().default(0),
});

export const workspaceSessionMappings = sqliteTable(
  "workspace_session_mappings",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.workspaceId, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    linkedAt: text("linked_at").notNull(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.workspaceId, table.sessionId],
    }),
    uniqueSessionId: uniqueIndex("workspace_session_mappings_session_id_idx").on(
      table.sessionId,
    ),
  }),
);

export const sessions = sqliteTable(
  "sessions",
  {
    sessionId: text("session_id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.workspaceId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    startedAt: text("started_at"),
    lastMessageAt: text("last_message_at"),
    activeApprovalId: text("active_approval_id"),
    currentTurnId: text("current_turn_id"),
    pendingAssistantMessageId: text("pending_assistant_message_id"),
    appSessionOverlayState: text("app_session_overlay_state").notNull(),
  },
  (table) => ({
    workspaceUpdatedAtIndex: uniqueIndex("sessions_session_id_idx").on(table.sessionId),
  }),
);

export const messages = sqliteTable(
  "messages",
  {
    messageId: text("message_id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
    sourceItemType: text("source_item_type").notNull(),
    clientMessageId: text("client_message_id"),
  },
  (table) => ({
    sessionCreatedAtIndex: uniqueIndex("messages_session_id_message_id_idx").on(
      table.sessionId,
      table.messageId,
    ),
    sessionClientMessageIndex: uniqueIndex("messages_session_id_client_message_id_idx").on(
      table.sessionId,
      table.clientMessageId,
    ),
  }),
);

export const approvals = sqliteTable(
  "approvals",
  {
    approvalId: text("approval_id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.workspaceId, { onDelete: "cascade" }),
    status: text("status").notNull(),
    resolution: text("resolution"),
    approvalCategory: text("approval_category").notNull(),
    summary: text("summary").notNull(),
    reason: text("reason").notNull(),
    operationSummary: text("operation_summary"),
    context: text("context"),
    createdAt: text("created_at").notNull(),
    resolvedAt: text("resolved_at"),
    nativeRequestKind: text("native_request_kind").notNull(),
  },
  (table) => ({
    sessionCreatedAtIndex: uniqueIndex("approvals_session_id_approval_id_idx").on(
      table.sessionId,
      table.approvalId,
    ),
  }),
);

export const sessionEvents = sqliteTable(
  "session_events",
  {
    eventId: text("event_id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sequence: integer("sequence").notNull(),
    occurredAt: text("occurred_at").notNull(),
    payload: text("payload").notNull(),
    nativeEventName: text("native_event_name"),
  },
  (table) => ({
    sessionEventIdIndex: uniqueIndex("session_events_session_id_event_id_idx").on(
      table.sessionId,
      table.eventId,
    ),
    sessionSequenceIndex: uniqueIndex("session_events_session_id_sequence_idx").on(
      table.sessionId,
      table.sequence,
    ),
  }),
);

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type ApprovalRow = typeof approvals.$inferSelect;
export type SessionEventRow = typeof sessionEvents.$inferSelect;
