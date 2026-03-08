import type { WorkspaceEntry } from '../types';

export interface ChangedWorkspaceFile {
  gitStatus: string;
  name: string;
  path: string;
}

export function splitAnswerText(text: string): string[] {
  return String(text || '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function findFirstFileNode(nodes: WorkspaceEntry[]): WorkspaceEntry | null {
  for (const node of nodes || []) {
    if (node.type === 'file') {
      return node;
    }
    if (node.type === 'directory') {
      const nested = findFirstFileNode(node.children || []);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

export function findEntryByPath(nodes: WorkspaceEntry[], targetPath: string): WorkspaceEntry | null {
  for (const node of nodes || []) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.type === 'directory') {
      const nested = findEntryByPath(node.children || [], targetPath);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

export function describeGitStatus(code?: string): string {
  const trimmed = String(code || '').trim();
  return trimmed || 'clean';
}

export function isChangedGitStatus(code?: string): boolean {
  return describeGitStatus(code) !== 'clean';
}

export function collectChangedFiles(nodes: WorkspaceEntry[]): ChangedWorkspaceFile[] {
  const files: ChangedWorkspaceFile[] = [];

  function walk(entries: WorkspaceEntry[]) {
    for (const entry of entries || []) {
      if (entry.type === 'directory') {
        walk(entry.children || []);
        continue;
      }

      if (!isChangedGitStatus(entry.gitStatus)) {
        continue;
      }

      files.push({
        gitStatus: describeGitStatus(entry.gitStatus),
        name: entry.name,
        path: entry.path,
      });
    }
  }

  walk(nodes);
  return files;
}
