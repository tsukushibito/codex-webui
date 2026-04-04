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
    appSessionOverlayState: text("app_session_overlay_state").notNull(),
  },
  (table) => ({
    workspaceUpdatedAtIndex: uniqueIndex("sessions_session_id_idx").on(table.sessionId),
  }),
);

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
