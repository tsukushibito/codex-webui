"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { execFile } = require("node:child_process");
const { createHash } = require("node:crypto");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function createWorkspaceService({ maxFileBytes, workspaceRootRealPath }) {
  function isPathInside(parentPath, childPath) {
    const relativePath = path.relative(parentPath, childPath);
    return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
  }

  function resolveWorkspacePath(requestedPath) {
    const rawPath = String(requestedPath || "").trim();
    if (!rawPath) {
      throw new Error("path is required");
    }

    const candidatePath = path.resolve(workspaceRootRealPath, rawPath);
    let resolvedPath;
    try {
      resolvedPath = fs.realpathSync.native(candidatePath);
    } catch (err) {
      if (err && err.code === "ENOENT") {
        throw new Error(`path not found: ${rawPath}`);
      }
      throw err;
    }

    if (!isPathInside(workspaceRootRealPath, resolvedPath)) {
      throw new Error(`path escapes workspace: ${rawPath}`);
    }

    return {
      rawPath,
      absolutePath: resolvedPath,
      relativePath: path.relative(workspaceRootRealPath, resolvedPath).split(path.sep).join("/"),
    };
  }

  function normalizeRepoRelativePath(requestedPath) {
    const rawPath = String(requestedPath || "").trim();
    if (!rawPath) {
      throw new Error("path is required");
    }

    const candidatePath = path.resolve(workspaceRootRealPath, rawPath);
    if (!isPathInside(workspaceRootRealPath, candidatePath)) {
      throw new Error(`path escapes workspace: ${rawPath}`);
    }

    const relativePath = path.relative(workspaceRootRealPath, candidatePath).split(path.sep).join("/");
    if (!relativePath || relativePath === ".") {
      throw new Error("path must point to a file");
    }

    return {
      rawPath,
      absolutePath: candidatePath,
      relativePath,
    };
  }

  async function runGit(args) {
    const { stdout } = await execFileAsync("git", ["-C", workspaceRootRealPath, ...args], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout;
  }

  async function runGitBuffer(args) {
    const { stdout } = await execFileAsync("git", ["-C", workspaceRootRealPath, ...args], {
      encoding: "buffer",
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout;
  }

  function isGitMissingObjectError(err) {
    if (typeof err?.stderr !== "string") {
      return false;
    }
    return (
      err.stderr.includes("exists on disk, but not in") ||
      err.stderr.includes("pathspec") ||
      err.stderr.includes("Not a valid object name") ||
      err.stderr.includes("invalid object name") ||
      err.stderr.includes("does not exist in")
    );
  }

  function parseGitStatusPorcelain(output) {
    const statuses = new Map();
    const records = output.split("\0");

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (!record) {
        continue;
      }

      const code = record.slice(0, 2);
      const currentPath = record.slice(3);
      if (!currentPath) {
        continue;
      }

      if (code.includes("R") || code.includes("C")) {
        index += 1;
      }

      statuses.set(currentPath, {
        code,
        indexStatus: code[0],
        worktreeStatus: code[1],
        isUntracked: code === "??",
      });
    }

    return statuses;
  }

  function createDirectoryNode(name, nodePath) {
    return {
      type: "directory",
      name,
      path: nodePath,
      children: [],
    };
  }

  function createFileNode(name, nodePath, metadata) {
    return {
      type: "file",
      name,
      path: nodePath,
      tracked: metadata.tracked,
      gitStatus: metadata.gitStatus,
      indexStatus: metadata.indexStatus,
      worktreeStatus: metadata.worktreeStatus,
    };
  }

  function sortTreeNodes(nodes) {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "directory" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      if (node.type === "directory") {
        sortTreeNodes(node.children);
      }
    }
  }

  function buildFileTree(fileEntries) {
    const root = [];
    const directories = new Map([["", { children: root }]]);

    for (const entry of fileEntries) {
      const parts = entry.path.split("/").filter(Boolean);
      let parentPath = "";
      let parentNode = directories.get(parentPath);

      for (let index = 0; index < parts.length; index += 1) {
        const name = parts[index];
        const nodePath = parentPath ? `${parentPath}/${name}` : name;
        const isLeaf = index === parts.length - 1;

        if (isLeaf) {
          parentNode.children.push(createFileNode(name, nodePath, entry));
          continue;
        }

        let directoryNode = directories.get(nodePath);
        if (!directoryNode) {
          directoryNode = createDirectoryNode(name, nodePath);
          directories.set(nodePath, directoryNode);
          parentNode.children.push(directoryNode);
        }

        parentPath = nodePath;
        parentNode = directoryNode;
      }
    }

    sortTreeNodes(root);
    return root;
  }

  function ensureTextFile(buffer, requestedPath) {
    if (buffer.includes(0)) {
      throw new Error(`binary files are not supported: ${requestedPath}`);
    }
  }

  function toTextPayload(pathname, ref, exists, buffer) {
    if (!exists) {
      return {
        path: pathname,
        ref,
        exists: false,
        size: 0,
        content: "",
      };
    }

    if (buffer.length > maxFileBytes) {
      throw new Error(`file is too large: ${pathname}`);
    }
    ensureTextFile(buffer, pathname);

    return {
      path: pathname,
      ref,
      exists: true,
      size: buffer.length,
      content: buffer.toString("utf8"),
    };
  }

  async function listWorkspaceFiles() {
    const [trackedOutput, statusOutput] = await Promise.all([
      runGit(["ls-files", "-z", "--cached"]),
      runGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    ]);

    const statuses = parseGitStatusPorcelain(statusOutput);
    const entries = new Map();

    for (const trackedPath of trackedOutput.split("\0")) {
      if (!trackedPath) {
        continue;
      }

      entries.set(trackedPath, {
        path: trackedPath,
        tracked: true,
        gitStatus: statuses.get(trackedPath)?.code || "  ",
        indexStatus: statuses.get(trackedPath)?.indexStatus || " ",
        worktreeStatus: statuses.get(trackedPath)?.worktreeStatus || " ",
      });
    }

    for (const [filePath, status] of statuses.entries()) {
      if (!status.isUntracked) {
        continue;
      }

      entries.set(filePath, {
        path: filePath,
        tracked: false,
        gitStatus: status.code,
        indexStatus: status.indexStatus,
        worktreeStatus: status.worktreeStatus,
      });
    }

    const visibleEntries = [];
    for (const entry of entries.values()) {
      const absolutePath = path.resolve(workspaceRootRealPath, entry.path);
      if (!fs.existsSync(absolutePath)) {
        continue;
      }

      let stat;
      try {
        const resolvedPath = fs.realpathSync.native(absolutePath);
        if (!isPathInside(workspaceRootRealPath, resolvedPath)) {
          continue;
        }
        stat = fs.statSync(resolvedPath);
      } catch {
        continue;
      }

      if (!stat.isFile()) {
        continue;
      }

      visibleEntries.push(entry);
    }

    visibleEntries.sort((left, right) => left.path.localeCompare(right.path));
    return visibleEntries;
  }

  async function listWorkspaceTree() {
    return buildFileTree(await listWorkspaceFiles());
  }

  async function listWorkspaceCatalog() {
    const entries = await listWorkspaceFiles();
    return {
      entries,
      tree: buildFileTree(entries),
    };
  }

  async function readWorkspaceFile(requestedPath) {
    const resolved = resolveWorkspacePath(requestedPath);
    const stat = await fs.promises.stat(resolved.absolutePath);

    if (!stat.isFile()) {
      throw new Error(`path is not a file: ${requestedPath}`);
    }
    if (stat.size > maxFileBytes) {
      throw new Error(`file is too large: ${requestedPath}`);
    }

    const buffer = await fs.promises.readFile(resolved.absolutePath);
    ensureTextFile(buffer, requestedPath);

    return {
      path: resolved.relativePath,
      size: buffer.length,
      content: buffer.toString("utf8"),
    };
  }

  async function gitObjectExists(ref, relativePath) {
    try {
      await runGit(["cat-file", "-e", `${ref}:${relativePath}`]);
      return true;
    } catch (err) {
      if (typeof err?.code === "number" && isGitMissingObjectError(err)) {
        return false;
      }
      throw err;
    }
  }

  async function assertGitRefExists(ref) {
    try {
      await runGit(["rev-parse", "--verify", "--quiet", `${ref}^{object}`]);
    } catch (err) {
      if (typeof err?.code === "number") {
        throw new Error(`invalid ref: ${ref}`);
      }
      throw err;
    }
  }

  async function gitObjectType(ref, relativePath) {
    const output = await runGit(["cat-file", "-t", `${ref}:${relativePath}`]);
    return output.trim();
  }

  async function readGitFile(requestedPath, ref = "HEAD") {
    const normalized = normalizeRepoRelativePath(requestedPath);
    await assertGitRefExists(ref);
    const exists = await gitObjectExists(ref, normalized.relativePath);
    if (!exists) {
      return toTextPayload(normalized.relativePath, ref, false, Buffer.alloc(0));
    }

    const objectType = await gitObjectType(ref, normalized.relativePath);
    if (objectType !== "blob") {
      throw new Error(`path is not a file: ${requestedPath}`);
    }

    const buffer = await runGitBuffer(["show", `${ref}:${normalized.relativePath}`]);
    return toTextPayload(normalized.relativePath, ref, true, buffer);
  }

  async function readWorkspaceFileVersion(requestedPath) {
    const normalized = normalizeRepoRelativePath(requestedPath);
    if (!fs.existsSync(normalized.absolutePath)) {
      return toTextPayload(normalized.relativePath, "WORKTREE", false, Buffer.alloc(0));
    }

    const entryStat = await fs.promises.lstat(normalized.absolutePath);
    if (entryStat.isSymbolicLink()) {
      const resolvedPath = fs.realpathSync.native(normalized.absolutePath);
      if (!isPathInside(workspaceRootRealPath, resolvedPath)) {
        throw new Error(`path escapes workspace: ${requestedPath}`);
      }
      const linkTarget = await fs.promises.readlink(normalized.absolutePath, "utf8");
      return toTextPayload(normalized.relativePath, "WORKTREE", true, Buffer.from(linkTarget, "utf8"));
    }

    const resolved = resolveWorkspacePath(normalized.relativePath);
    const stat = await fs.promises.stat(resolved.absolutePath);
    if (!stat.isFile()) {
      throw new Error(`path is not a file: ${requestedPath}`);
    }

    const buffer = await fs.promises.readFile(resolved.absolutePath);
    return toTextPayload(normalized.relativePath, "WORKTREE", true, buffer);
  }

  async function readGitStatus(requestedPath) {
    const normalized = normalizeRepoRelativePath(requestedPath);
    const output = await runGit([
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--",
      normalized.relativePath,
    ]);
    const status = parseGitStatusPorcelain(output).get(normalized.relativePath);

    return {
      path: normalized.relativePath,
      gitStatus: status?.code || "  ",
      indexStatus: status?.indexStatus || " ",
      worktreeStatus: status?.worktreeStatus || " ",
    };
  }

  async function readGitDiff(requestedPath) {
    const status = await readGitStatus(requestedPath);
    const [left, right] = await Promise.all([
      readGitFile(status.path, "HEAD"),
      readWorkspaceFileVersion(status.path),
    ]);

    if (!left.exists && !right.exists) {
      throw new Error(`path not found: ${status.path}`);
    }

    return {
      path: status.path,
      gitStatus: status.gitStatus,
      indexStatus: status.indexStatus,
      worktreeStatus: status.worktreeStatus,
      left,
      right,
    };
  }

  function hashBuffer(buffer) {
    return createHash("sha256").update(buffer).digest("hex");
  }

  function defaultGitStatus(status = {}) {
    return {
      gitStatus: status.gitStatus || status.code || "  ",
      indexStatus: status.indexStatus || " ",
      worktreeStatus: status.worktreeStatus || " ",
    };
  }

  async function captureWorkspaceSnapshotEntry(relativePath, tracked, status) {
    const absolutePath = path.resolve(workspaceRootRealPath, relativePath);
    const statusFields = defaultGitStatus(status);

    let entryStat = null;
    try {
      entryStat = await fs.promises.lstat(absolutePath);
    } catch (err) {
      if (err && err.code !== "ENOENT") {
        throw err;
      }
    }

    if (!entryStat) {
      return {
        path: relativePath,
        tracked,
        exists: false,
        kind: "missing",
        digest: null,
        ...statusFields,
      };
    }

    if (entryStat.isSymbolicLink()) {
      const resolvedPath = fs.realpathSync.native(absolutePath);
      if (!isPathInside(workspaceRootRealPath, resolvedPath)) {
        throw new Error(`path escapes workspace: ${relativePath}`);
      }
      const linkTarget = await fs.promises.readlink(absolutePath, "utf8");
      return {
        path: relativePath,
        tracked,
        exists: true,
        kind: "symlink",
        digest: hashBuffer(Buffer.from(linkTarget, "utf8")),
        ...statusFields,
      };
    }

    const resolvedPath = fs.realpathSync.native(absolutePath);
    if (!isPathInside(workspaceRootRealPath, resolvedPath)) {
      throw new Error(`path escapes workspace: ${relativePath}`);
    }

    const resolvedStat = await fs.promises.stat(resolvedPath);
    if (resolvedStat.isFile()) {
      const buffer = await fs.promises.readFile(resolvedPath);
      return {
        path: relativePath,
        tracked,
        exists: true,
        kind: "file",
        digest: hashBuffer(buffer),
        ...statusFields,
      };
    }

    return {
      path: relativePath,
      tracked,
      exists: true,
      kind: "other",
      digest: hashBuffer(Buffer.from(`${entryStat.mode}:${resolvedStat.size}`)),
      ...statusFields,
    };
  }

  async function captureWorkspaceSnapshot() {
    const [trackedOutput, statusOutput] = await Promise.all([
      runGit(["ls-files", "-z", "--cached"]),
      runGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    ]);

    const statuses = parseGitStatusPorcelain(statusOutput);
    const trackedPaths = new Set(trackedOutput.split("\0").filter(Boolean));
    const snapshotPaths = new Set([...trackedPaths, ...statuses.keys()]);
    const sortedPaths = Array.from(snapshotPaths).sort((left, right) => left.localeCompare(right));

    const entries = await Promise.all(
      sortedPaths.map((relativePath) => captureWorkspaceSnapshotEntry(
        relativePath,
        trackedPaths.has(relativePath),
        statuses.get(relativePath),
      )),
    );

    return new Map(entries.map((entry) => [entry.path, entry]));
  }

  return {
    captureWorkspaceSnapshot,
    listWorkspaceCatalog,
    listWorkspaceFiles,
    listWorkspaceTree,
    readGitDiff,
    readGitFile,
    readWorkspaceFile,
  };
}

module.exports = {
  createWorkspaceService,
};
