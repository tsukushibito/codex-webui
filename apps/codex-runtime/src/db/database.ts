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
  app_session_overlay_state TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
);
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
