import type { GitDiffRecord, WorkspaceFile } from '../types';
import { DiffPreviewSection } from './DiffPreviewSection';
import { FilePreviewSection } from './FilePreviewSection';

export type InspectTabId = 'file' | 'diff';

interface InspectPanelProps {
  diff: GitDiffRecord | null;
  diffError: string;
  file: WorkspaceFile | null;
  filePreviewError: string;
  loading: boolean;
  onSelectTab: (tab: InspectTabId) => void;
  selectedPath: string | null;
  tab: InspectTabId;
}

export function InspectPanel(props: InspectPanelProps) {
  const {
    diff,
    diffError,
    file,
    filePreviewError,
    loading,
    onSelectTab,
    selectedPath,
    tab,
  } = props;

  return (
    <section className="inspect-panel-shell">
      <header className="inspect-panel-header">
        <div>
          <p className="eyebrow">Inspect</p>
          <h2>{tab === 'file' ? 'Workspace file' : 'Git diff'}</h2>
        </div>
        <div className="inspect-tabs" role="tablist" aria-label="Inspect views">
          <button
            aria-selected={tab === 'file'}
            className={`inspect-tab${tab === 'file' ? ' is-active' : ''}`}
            onClick={() => onSelectTab('file')}
            role="tab"
            type="button"
          >
            File
          </button>
          <button
            aria-selected={tab === 'diff'}
            className={`inspect-tab${tab === 'diff' ? ' is-active' : ''}`}
            onClick={() => onSelectTab('diff')}
            role="tab"
            type="button"
          >
            Diff
          </button>
        </div>
      </header>

      {selectedPath ? <p className="selected-path">{selectedPath}</p> : null}

      {tab === 'file' ? (
        <FilePreviewSection
          error={filePreviewError}
          file={file}
          loading={loading}
          selectedPath={selectedPath}
        />
      ) : (
        <DiffPreviewSection
          diff={diff}
          error={diffError}
          loading={loading}
          selectedPath={selectedPath}
        />
      )}
    </section>
  );
}
