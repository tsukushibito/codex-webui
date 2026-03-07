import type { WorkspaceFile } from '../types';

interface FilePreviewSectionProps {
  error: string;
  file: WorkspaceFile | null;
  loading: boolean;
  selectedPath: string | null;
}

export function FilePreviewSection(props: FilePreviewSectionProps) {
  const { error, file, loading, selectedPath } = props;

  if (!selectedPath) {
    return <div className="file-preview empty">Select a file from the tree to inspect its workspace contents.</div>;
  }

  if (loading) {
    return <div className="file-preview empty">Loading workspace file for {selectedPath}...</div>;
  }

  if (error) {
    return <div className="file-preview empty">{error}</div>;
  }

  if (!file) {
    return <div className="file-preview empty">No workspace file content available.</div>;
  }

  return (
    <div className="file-preview">
      <article className="inspector-card">
        <p className="inspector-meta">{file.path} · {file.size} bytes</p>
        <pre className="code-block">{file.content}</pre>
      </article>
    </div>
  );
}
