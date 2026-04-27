import type { TimelineDisplayGroup, TimelineDisplayRow } from "./timeline-display-model";

export interface TimelineRequestRowContext {
  state: "pending" | "resolved";
  badgeClassName: string;
  badgeLabel: string;
  requestSummary: string;
  requestReason: string | null;
  requestOperationSummary: string | null;
  showRequestDetailButton: boolean;
  showResponseActions: boolean;
}

export interface ChatViewTimelineProps {
  isLoadingThread: boolean;
  selectedThreadId: string | null;
  hasLoadedThreadView: boolean;
  groups: TimelineDisplayGroup[];
  expandedRowIds: ReadonlySet<string>;
  formatTimestamp: (value: string | null) => string;
  onToggleRowExpansion: (rowId: string) => void;
  onOpenDetail: (timelineItemId: string) => void;
  requestRowContexts: Partial<Record<string, TimelineRequestRowContext>>;
  isRespondingToRequest: boolean;
  onApproveRequest: () => void;
  onDenyRequest: () => void;
  onOpenRequestDetail: () => void;
}

function timelineRowClass(row: TimelineDisplayRow) {
  const tone =
    row.tone ?? (row.role === "user" ? "user" : row.role === "assistant" ? "codex" : "muted");

  return `timeline-row timeline-row-${row.density} timeline-row-${row.role} timeline-row-tone-${tone}`;
}

const TIMELINE_PREVIEW_LINE_LIMIT = 8;
const TIMELINE_PREVIEW_CHARACTER_LIMIT = 520;

function timelineContentPreview(content: string) {
  const lines = content.split(/\r?\n/);
  const lineFolded = lines.length > TIMELINE_PREVIEW_LINE_LIMIT;
  const linePreview = lineFolded ? lines.slice(0, TIMELINE_PREVIEW_LINE_LIMIT).join("\n") : content;

  if (linePreview.length <= TIMELINE_PREVIEW_CHARACTER_LIMIT) {
    return {
      isFoldable: lineFolded,
      preview: lineFolded ? `${linePreview.trimEnd()}\n...` : content,
    };
  }

  const clipped = linePreview.slice(0, TIMELINE_PREVIEW_CHARACTER_LIMIT);
  const lastWhitespace = clipped.search(/\s+\S*$/);
  const preview =
    lastWhitespace > TIMELINE_PREVIEW_CHARACTER_LIMIT * 0.72
      ? clipped.slice(0, lastWhitespace)
      : clipped;

  return {
    isFoldable: true,
    preview: `${preview.trimEnd()}...`,
  };
}

export function ChatViewTimeline({
  isLoadingThread,
  selectedThreadId,
  hasLoadedThreadView,
  groups,
  expandedRowIds,
  formatTimestamp,
  onToggleRowExpansion,
  onOpenDetail,
  requestRowContexts,
  isRespondingToRequest,
  onApproveRequest,
  onDenyRequest,
  onOpenRequestDetail,
}: ChatViewTimelineProps) {
  return (
    <section aria-label="Timeline" className="timeline-section">
      {isLoadingThread ? (
        <p className="workspace-status">
          {selectedThreadId
            ? "Opening this thread and restoring its latest timeline..."
            : "Preparing thread view..."}
        </p>
      ) : null}

      <div className="chat-message-list">
        {!isLoadingThread && hasLoadedThreadView && groups.length === 0 ? (
          <p className="empty-state">
            No timeline items yet. Start the thread or send follow-up input to continue.
          </p>
        ) : null}

        {groups.map((group) => (
          <section
            className={group.turnId ? "timeline-turn-group" : "timeline-ungrouped-item"}
            data-turn-id={group.turnId ?? undefined}
            key={group.id}
          >
            {group.turnId ? (
              <div className="timeline-turn-label">
                <span>Turn</span>
                <strong>{group.turnId}</strong>
              </div>
            ) : null}
            {group.rows.map((row) => {
              const requestContext = requestRowContexts[row.id] ?? null;
              const contentPreview = row.defaultFoldEligible
                ? timelineContentPreview(row.content)
                : {
                    isFoldable: false,
                    preview: row.content,
                  };
              const isExpanded = expandedRowIds.has(row.id);
              const displayedContent =
                contentPreview.isFoldable && !isExpanded ? contentPreview.preview : row.content;

              return (
                <article
                  className={`${timelineRowClass(row)}${
                    contentPreview.isFoldable && !isExpanded ? " timeline-row-folded" : ""
                  }`}
                  key={row.id}
                >
                  <div className="workspace-meta-row timeline-row-meta">
                    <strong>{row.label}</strong>
                    <span className="workspace-meta">
                      {row.isLive ? "Live" : formatTimestamp(row.occurredAt)}
                    </span>
                  </div>
                  <p className="timeline-row-content">{displayedContent}</p>
                  {requestContext ? (
                    <div className="workspace-meta-row timeline-request-row-status">
                      <span className={requestContext.badgeClassName}>
                        {requestContext.badgeLabel}
                      </span>
                    </div>
                  ) : null}
                  {requestContext?.state === "pending" ? (
                    <div className="timeline-request-inline-details">
                      <div className="timeline-request-inline-summary">
                        <strong>Request summary</strong>
                        <p>{requestContext.requestSummary}</p>
                      </div>
                      {requestContext.requestReason ? (
                        <p className="timeline-request-inline-note">
                          <strong>Reason</strong>
                          <span>{requestContext.requestReason}</span>
                        </p>
                      ) : null}
                      {requestContext.requestOperationSummary ? (
                        <p className="timeline-request-inline-note">
                          <strong>Operation</strong>
                          <code className="artifact-inline">
                            {requestContext.requestOperationSummary}
                          </code>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {contentPreview.isFoldable ||
                  row.showDetailButton ||
                  requestContext?.showRequestDetailButton ||
                  requestContext?.showResponseActions ? (
                    <div className="timeline-row-actions">
                      {contentPreview.isFoldable ? (
                        <button
                          aria-label={
                            isExpanded
                              ? `Collapse ${row.label} content`
                              : `Expand ${row.label} content`
                          }
                          aria-expanded={isExpanded}
                          className="secondary-link action-button inline-detail-button"
                          onClick={() => onToggleRowExpansion(row.id)}
                          type="button"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                      {requestContext?.showResponseActions ? (
                        <>
                          <button
                            className="approve-button action-button compact-button"
                            disabled={isRespondingToRequest}
                            onClick={onApproveRequest}
                            type="button"
                          >
                            {isRespondingToRequest ? "Submitting..." : "Approve request"}
                          </button>
                          <button
                            className="danger-button action-button compact-button"
                            disabled={isRespondingToRequest}
                            onClick={onDenyRequest}
                            type="button"
                          >
                            Deny request
                          </button>
                        </>
                      ) : null}
                      {requestContext?.showRequestDetailButton ? (
                        <button
                          className="secondary-link action-button compact-button"
                          onClick={onOpenRequestDetail}
                          type="button"
                        >
                          Request detail
                        </button>
                      ) : null}
                      {row.showDetailButton && row.timelineItemId ? (
                        <button
                          className="secondary-link action-button inline-detail-button"
                          onClick={() => onOpenDetail(row.timelineItemId ?? "")}
                          type="button"
                        >
                          {row.detailActionLabel ?? "Inspect details"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );
}
