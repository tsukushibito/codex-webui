import type { WorkspaceEntry } from '../types';
import { describeGitStatus } from '../lib/workspace';

interface WorkspaceTreeProps {
  entries: WorkspaceEntry[];
  loading: boolean;
  onSelectPath: (path: string) => Promise<void>;
  selectedPath: string | null;
}

function WorkspaceTreeNodes(props: WorkspaceTreeProps & { depth: number }) {
  const { depth, entries, onSelectPath, selectedPath } = props;

  return (
    <>
      {entries.map((entry) => {
        if (entry.type === 'directory') {
          return (
            <section className="tree-directory" key={entry.path}>
              <div className="tree-directory-label" style={{ paddingLeft: `${depth * 12}px` }}>
                {entry.name}
              </div>
              <div className="tree-children">
                <WorkspaceTreeNodes
                  depth={depth + 1}
                  entries={entry.children || []}
                  loading={props.loading}
                  onSelectPath={onSelectPath}
                  selectedPath={selectedPath}
                />
              </div>
            </section>
          );
        }

        return (
          <button
            className={`tree-file${entry.path === selectedPath ? ' is-selected' : ''}`}
            key={entry.path}
            onClick={async () => {
              await onSelectPath(entry.path);
            }}
            type="button"
          >
            <span className="tree-file-name">{entry.name}</span>
            <span className="tree-file-status">{describeGitStatus(entry.gitStatus)}</span>
          </button>
        );
      })}
    </>
  );
}

export function WorkspaceTree(props: WorkspaceTreeProps) {
  const { entries, loading, onSelectPath, selectedPath } = props;

  if (loading) {
    return <div className="workspace-tree empty">Loading files...</div>;
  }

  if (entries.length === 0) {
    return <div className="workspace-tree empty">No files available.</div>;
  }

  return (
    <div className="workspace-tree">
      <WorkspaceTreeNodes
        depth={0}
        entries={entries}
        loading={loading}
        onSelectPath={onSelectPath}
        selectedPath={selectedPath}
      />
    </div>
  );
}
