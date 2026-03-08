import { useEffect, useMemo, useState } from 'preact/hooks';
import type { WorkspaceEntry } from '../types';
import { collectChangedFiles, describeGitStatus, type ChangedWorkspaceFile } from '../lib/workspace';

interface WorkspaceTreeProps {
  entries: WorkspaceEntry[];
  loading: boolean;
  onSelectPath: (path: string) => Promise<void>;
  selectedPath: string | null;
}

interface WorkspaceTreeNodesProps extends WorkspaceTreeProps {
  depth: number;
  expandedPaths: Set<string>;
  onToggleDirectory: (path: string) => void;
}

function collectDirectoryPaths(entries: WorkspaceEntry[]): Set<string> {
  const directoryPaths = new Set<string>();

  function walk(nodes: WorkspaceEntry[]) {
    for (const node of nodes) {
      if (node.type !== 'directory') {
        continue;
      }
      directoryPaths.add(node.path);
      walk(node.children || []);
    }
  }

  walk(entries);
  return directoryPaths;
}

function ChangedFilesSection(props: {
  files: ChangedWorkspaceFile[];
  onSelectPath: (path: string) => Promise<void>;
  selectedPath: string | null;
}) {
  const { files, onSelectPath, selectedPath } = props;

  return (
    <section className="workspace-section">
      <div className="workspace-section-heading">
        <h3>Changed</h3>
        <p>Files with current Git or worktree changes.</p>
      </div>

      {files.length === 0 ? (
        <p className="workspace-section-empty">No changed files in the current workspace snapshot.</p>
      ) : (
        <div className="workspace-list changed-list">
          {files.map((file) => {
            const directoryLabel = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : 'workspace root';
            return (
              <button
                aria-label={`Changed file ${file.path} ${file.gitStatus}`}
                className={`workspace-row workspace-row-file${file.path === selectedPath ? ' is-selected' : ''}`}
                key={`changed-${file.path}`}
                onClick={async () => {
                  await onSelectPath(file.path);
                }}
                type="button"
              >
                <span aria-hidden="true" className="workspace-row-icon tree-file-icon">
                  •
                </span>
                <span className="workspace-row-copy">
                  <span className="workspace-row-title">{file.name}</span>
                  <span className="workspace-row-subtitle">{directoryLabel}</span>
                </span>
                <span className="workspace-row-status">{file.gitStatus}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WorkspaceTreeNodes(props: WorkspaceTreeNodesProps) {
  const { depth, entries, expandedPaths, onSelectPath, onToggleDirectory, selectedPath } = props;

  return (
    <>
      {entries.map((entry) => {
        if (entry.type === 'directory') {
          const isExpanded = expandedPaths.has(entry.path);
          return (
            <section className="tree-directory" key={entry.path}>
              <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${entry.name} directory`}
                className="workspace-row workspace-row-directory tree-directory-toggle"
                onClick={() => onToggleDirectory(entry.path)}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                type="button"
              >
                <span aria-hidden="true" className="workspace-row-icon tree-directory-chevron">
                  {isExpanded ? '▾' : '▸'}
                </span>
                <span className="workspace-row-title tree-directory-name">{entry.name}</span>
              </button>
              {isExpanded ? (
                <div className="tree-children">
                  <WorkspaceTreeNodes
                    depth={depth + 1}
                    entries={entry.children || []}
                    expandedPaths={expandedPaths}
                    loading={props.loading}
                    onSelectPath={onSelectPath}
                    onToggleDirectory={onToggleDirectory}
                    selectedPath={selectedPath}
                  />
                </div>
              ) : null}
            </section>
          );
        }

        return (
          <button
            className={`workspace-row workspace-row-file tree-file${entry.path === selectedPath ? ' is-selected' : ''}`}
            key={entry.path}
            onClick={async () => {
              await onSelectPath(entry.path);
            }}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
            type="button"
          >
            <span aria-hidden="true" className="workspace-row-icon tree-file-icon">
              •
            </span>
            <span className="workspace-row-title tree-file-name">{entry.name}</span>
            <span className="workspace-row-status tree-file-status">{describeGitStatus(entry.gitStatus)}</span>
          </button>
        );
      })}
    </>
  );
}

export function WorkspaceTree(props: WorkspaceTreeProps) {
  const { entries, loading, onSelectPath, selectedPath } = props;
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const directoryPaths = useMemo(() => collectDirectoryPaths(entries), [entries]);
  const changedFiles = useMemo(() => collectChangedFiles(entries), [entries]);

  useEffect(() => {
    if (!selectedPath) {
      return;
    }

    const segments = selectedPath.split('/');
    if (segments.length < 2) {
      return;
    }

    const parentPaths: string[] = [];
    for (let i = 1; i < segments.length; i += 1) {
      const candidate = segments.slice(0, i).join('/');
      if (directoryPaths.has(candidate)) {
        parentPaths.push(candidate);
      }
    }
    if (parentPaths.length === 0) {
      return;
    }

    setExpandedPaths((previous) => {
      const next = new Set(previous);
      for (const parentPath of parentPaths) {
        next.add(parentPath);
      }
      return next;
    });
  }, [directoryPaths, selectedPath]);

  function toggleDirectory(path: string) {
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  if (loading) {
    return <div className="workspace-tree empty">Loading files...</div>;
  }

  if (entries.length === 0) {
    return <div className="workspace-tree empty">No files available.</div>;
  }

  return (
    <div className="workspace-tree">
      <ChangedFilesSection
        files={changedFiles}
        onSelectPath={onSelectPath}
        selectedPath={selectedPath}
      />
      <section className="workspace-section">
        <div className="workspace-section-heading">
          <h3>Explorer</h3>
          <p>Browse the full repository tree.</p>
        </div>
        <div className="workspace-list explorer-list">
          <WorkspaceTreeNodes
            depth={0}
            entries={entries}
            expandedPaths={expandedPaths}
            loading={loading}
            onSelectPath={onSelectPath}
            onToggleDirectory={toggleDirectory}
            selectedPath={selectedPath}
          />
        </div>
      </section>
    </div>
  );
}
