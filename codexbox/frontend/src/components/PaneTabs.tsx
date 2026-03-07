import type { PaneId } from '../types';

interface PaneTabsProps {
  activePane: PaneId;
  onSelectPane: (pane: PaneId) => void;
}

const panes: Array<{ id: PaneId; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'files', label: 'Files' },
  { id: 'diff', label: 'Inspect' },
];

export function PaneTabs({ activePane, onSelectPane }: PaneTabsProps) {
  return (
    <nav className="workspace-nav" aria-label="Workspace panes">
      {panes.map((pane) => (
        <button
          key={pane.id}
          className={`pane-tab${activePane === pane.id ? ' is-active' : ''}`}
          onClick={() => onSelectPane(pane.id)}
          type="button"
        >
          {pane.label}
        </button>
      ))}
    </nav>
  );
}
