import { z } from "zod";

import { RuntimeError } from "../../errors.js";

const workspaceNamePattern = /^(?=.{1,64}$)[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const reservedWorkspaceNames = new Set(["node_modules", "dist", "coverage", "tmp", "var"]);

const createWorkspaceSchema = z.object({
  workspace_name: z.string(),
});

export function parseCreateWorkspaceInput(payload: unknown) {
  return createWorkspaceSchema.parse(payload);
}

export function validateWorkspaceName(rawValue: string) {
  if (rawValue.length === 0 || rawValue.trim() !== rawValue) {
    throw new RuntimeError(
      422,
      "workspace_name_invalid",
      "workspace name must be 1-64 lowercase characters without surrounding whitespace",
    );
  }

  if (!workspaceNamePattern.test(rawValue)) {
    throw new RuntimeError(
      422,
      "workspace_name_invalid",
      "workspace name must be 1-64 characters of lowercase letters, digits, hyphen, or underscore",
    );
  }

  if (reservedWorkspaceNames.has(rawValue)) {
    throw new RuntimeError(422, "workspace_name_reserved", "workspace name is reserved", {
      reserved_names: Array.from(reservedWorkspaceNames).sort(),
    });
  }

  return rawValue;
}
