import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { openRuntimeDatabase } from "../src/db/database.js";

export async function createTempWorkspaceRoot(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

export async function createTempDatabase(prefix: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  return openRuntimeDatabase(path.join(tempDir, "runtime.sqlite"));
}
