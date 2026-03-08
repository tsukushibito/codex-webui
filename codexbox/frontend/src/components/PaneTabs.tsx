import type { PaneId } from '../types';

interface PaneTabsProps {
  actionCount?: number;
  activePane: PaneId;
  onSelectPane: (pane: PaneId) => void;
}

const panes: Array<{ id: PaneId; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'actions', label: 'Actions' },
  { id: 'inspect', label: 'Inspect' },
];

export function PaneTabs({ actionCount = 0, activePane, onSelectPane }: PaneTabsProps) {
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
          {pane.id === 'actions' && actionCount > 0 ? (
            <span className="pane-tab-badge" aria-label={`${actionCount} pending actions`}>
              {actionCount}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
