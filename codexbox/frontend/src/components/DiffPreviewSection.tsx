import type { GitDiffRecord, GitDiffSide } from '../types';
import { describeGitStatus } from '../lib/workspace';

interface DiffPreviewSectionProps {
  diff: GitDiffRecord | null;
  error: string;
  loading: boolean;
  selectedPath: string | null;
}

function DiffSide({ payload, title }: { payload: GitDiffSide; title: string }) {
  return (
    <article className="diff-side">
      <div className="diff-side-heading">
        <h3 className="diff-side-title">{title}</h3>
        <p className="diff-side-ref">{payload.ref || ''}</p>
      </div>
      {!payload.exists ? (
        <p className="diff-empty">File does not exist on this side.</p>
      ) : (
        <pre className="code-block">{payload.content}</pre>
      )}
    </article>
  );
}

export function DiffPreviewSection(props: DiffPreviewSectionProps) {
  const { diff, error, loading, selectedPath } = props;

  if (!selectedPath) {
    return <div className="diff-view empty">Select a file to render its Git-backed diff.</div>;
  }

  if (loading) {
    return <div className="diff-view empty">Loading Git diff for {selectedPath}...</div>;
  }

  if (error) {
    return <div className="diff-view empty">{error}</div>;
  }

  if (!diff) {
    return <div className="diff-view empty">No Git diff available.</div>;
  }

  return (
    <div className="diff-view">
      <article className="diff-card">
        <p className="inspector-meta">{diff.path} · status {describeGitStatus(diff.gitStatus)}</p>
        <div className="diff-columns">
          <DiffSide payload={diff.left} title="HEAD" />
          <DiffSide payload={diff.right} title="WORKTREE" />
        </div>
      </article>
    </div>
  );
}
