import fs from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";

import { RuntimeError } from "../../errors.js";
import type { EligibleWorkspaceDirectory } from "./types.js";

export class WorkspaceFilesystem {
  constructor(private readonly workspaceRoot: string) {}

  getWorkspaceRoot() {
    return this.workspaceRoot;
  }

  getWorkspacePath(directoryName: string) {
    return path.join(this.workspaceRoot, directoryName);
  }

  async ensureWorkspaceRootExists() {
    let stat;

    try {
      stat = await fs.stat(this.workspaceRoot);
    } catch {
      throw new RuntimeError(
        404,
        "workspace_root_not_found",
        "workspace root directory does not exist",
        { workspace_root: this.workspaceRoot },
      );
    }

    if (!stat.isDirectory()) {
      throw new RuntimeError(
        404,
        "workspace_root_not_found",
        "workspace root path is not a directory",
        { workspace_root: this.workspaceRoot },
      );
    }
  }

  async createWorkspaceDirectory(directoryName: string) {
    await this.ensureWorkspaceRootExists();

    const fullPath = path.join(this.workspaceRoot, directoryName);

    try {
      await fs.mkdir(fullPath);
      return fullPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new RuntimeError(
          409,
          "workspace_name_conflict",
          "workspace directory already exists",
          { directory_name: directoryName },
        );
      }

      throw error;
    }
  }

  async workspacePathExists(directoryName: string) {
    const fullPath = this.getWorkspacePath(directoryName);

    try {
      await fs.lstat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async removeWorkspaceDirectoryIfEmpty(directoryName: string) {
    const fullPath = this.getWorkspacePath(directoryName);
    await fs.rm(fullPath, { recursive: false, force: true });
  }

  async listEligibleDirectories(): Promise<EligibleWorkspaceDirectory[]> {
    await this.ensureWorkspaceRootExists();

    const entries = await fs.readdir(this.workspaceRoot, {
      withFileTypes: true,
    });
    const eligible: EligibleWorkspaceDirectory[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(this.workspaceRoot, entry.name);
      let stat;

      try {
        stat = await fs.lstat(fullPath);
      } catch {
        continue;
      }

      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        continue;
      }

      try {
        await fs.access(
          fullPath,
          fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK,
        );
      } catch {
        continue;
      }

      eligible.push({
        directoryName: entry.name,
        fullPath,
      });
    }

    return eligible.sort((left, right) =>
      left.directoryName.localeCompare(right.directoryName),
    );
  }
}
