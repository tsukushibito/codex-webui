import type { WorkspaceEntry } from '../types';

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
