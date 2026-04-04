import fs from "node:fs";
import path from "node:path";

import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.js";

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  workspace_name TEXT NOT NULL UNIQUE,
  directory_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  active_session_id TEXT,
  pending_approval_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workspace_session_mappings (
  workspace_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, session_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_session_mappings_session_id_idx
ON workspace_session_mappings (session_id);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  last_message_at TEXT,
  active_approval_id TEXT,
  current_turn_id TEXT,
  pending_assistant_message_id TEXT,
  app_session_overlay_state TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_item_type TEXT NOT NULL,
  client_message_id TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS messages_session_id_message_id_idx
ON messages (session_id, message_id);

CREATE UNIQUE INDEX IF NOT EXISTS messages_session_id_client_message_id_idx
ON messages (session_id, client_message_id);

CREATE TABLE IF NOT EXISTS approvals (
  approval_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL,
  resolution TEXT,
  approval_category TEXT NOT NULL,
  summary TEXT NOT NULL,
  reason TEXT NOT NULL,
  operation_summary TEXT,
  context TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  native_request_kind TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS approvals_session_id_approval_id_idx
ON approvals (session_id, approval_id);
`;

export function openRuntimeDatabase(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(bootstrapSql);

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}

export type RuntimeDatabase = ReturnType<typeof openRuntimeDatabase>;
