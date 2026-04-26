import type { ReactNode } from "react";
import type { PublicRequestDetail, PublicThreadView, PublicTimelineItem } from "./thread-types";
import type { TimelineDisplayGroup } from "./timeline-display-model";
import type { TimelineItemDetail } from "./timeline-item-detail";

export type ThreadDetailSelection =
  | { kind: "thread_details" }
  | { kind: "request_detail" }
  | { kind: "timeline_item_detail"; timelineItemId: string };

export type ThreadFeedbackAction =
  | { kind: "refresh"; label: string }
  | { kind: "focus_composer"; label: string }
  | { kind: "interrupt"; label: string }
  | { kind: "approve"; label: string }
  | { kind: "deny"; label: string }
  | { kind: "request_detail"; label: string };

export type ThreadFeedbackDescriptor = {
  badgeTone: "default" | "success" | "warning";
  isVisible: boolean;
  title: string;
  summary: string;
  actions: ThreadFeedbackAction[];
};

export interface ChatViewDetailsProps {
  selection: ThreadDetailSelection;
  workspaceId: string | null;
  selectedThreadId: string | null;
  selectedWorkspaceName: string | null;
  selectedThreadView: PublicThreadView | null;
  selectedRequestDetail: PublicRequestDetail | null;
  selectedTimelineItem: PublicTimelineItem | null;
  selectedTimelineItemDetail: TimelineItemDetail | null;
  isOpeningSelectedThread: boolean;
  connectionState: "idle" | "live" | "reconnecting";
  composerGuidance: string | null;
  threadActivitySummary: string;
  threadFeedback: ThreadFeedbackDescriptor;
  timelineGroups: TimelineDisplayGroup[];
  isRespondingToRequest: boolean;
  formatTimestamp: (value: string | null) => string;
  formatMachineLabel: (value: string | null | undefined) => string;
  requestBadgeClass: (request: PublicRequestDetail | null) => string;
  renderThreadFeedbackAction: (action: ThreadFeedbackAction) => ReactNode;
  onClose: () => void;
  onSelectRequestDetail: () => void;
  onSelectTimelineItemDetail: (timelineItemId: string) => void;
  onApproveRequest: () => void;
  onDenyRequest: () => void;
}

function isCodeLikeFieldLabel(label: string) {
  return (
    label === "Request ID" ||
    label === "Operation" ||
    label === "Thread" ||
    label === "Turn" ||
    label === "Item"
  );
}

function detailFieldClass(label: string) {
  return isCodeLikeFieldLabel(label)
    ? "request-detail-field request-detail-field-code"
    : "request-detail-field";
}

function renderDetailFieldValue(
  field: { label: string; value: string; href?: string } | { label: string; value: string | null },
) {
  const isCodeLike = isCodeLikeFieldLabel(field.label);
  const content = isCodeLike ? <code className="artifact-inline">{field.value}</code> : field.value;

  if ("href" in field && field.href) {
    return (
      <a className="detail-link" href={field.href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return content;
}

export function ChatViewDetails({
  selection,
  workspaceId,
  selectedThreadId,
  selectedWorkspaceName,
  selectedThreadView,
  selectedRequestDetail,
  selectedTimelineItem,
  selectedTimelineItemDetail,
  isOpeningSelectedThread,
  connectionState,
  composerGuidance,
  threadActivitySummary,
  threadFeedback,
  timelineGroups,
  isRespondingToRequest,
  formatTimestamp,
  formatMachineLabel,
  requestBadgeClass,
  renderThreadFeedbackAction,
  onClose,
  onSelectRequestDetail,
  onSelectTimelineItemDetail,
  onApproveRequest,
  onDenyRequest,
}: ChatViewDetailsProps) {
  const artifactRows = timelineGroups.flatMap((group) =>
    group.rows
      .filter((row) => row.showDetailButton && row.timelineItemId)
      .map((row) => ({ ...row, timelineItemId: row.timelineItemId ?? "" })),
  );

  return (
    <aside className="chat-panel workspace-card thread-detail-surface">
      <header>
        <div className="workspace-meta-row">
          <p className="eyebrow">Detail</p>
          <button
            className="secondary-link action-button compact-button"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <h2>
          {selection.kind === "thread_details"
            ? "Thread details"
            : selection.kind === "request_detail"
              ? "Request detail"
              : (selectedTimelineItemDetail?.title ?? "Timeline detail")}
        </h2>
      </header>

      {selection.kind === "thread_details" ? (
        <div className="detail-stack">
          <section className="thread-detail-section detail-text-section">
            <strong>Overview</strong>
            <dl className="request-detail-list">
              <div>
                <dt>Title</dt>
                <dd>
                  {selectedThreadView?.thread.title ??
                    (workspaceId ? "New workspace input" : "No workspace selected")}
                </dd>
              </div>
              <div className={detailFieldClass("Thread")}>
                <dt>Thread</dt>
                <dd>
                  {selectedThreadView?.thread.thread_id ? (
                    <code className="artifact-inline">{selectedThreadView.thread.thread_id}</code>
                  ) : (
                    "Not started"
                  )}
                </dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>{selectedWorkspaceName ?? workspaceId ?? "Not selected"}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatTimestamp(selectedThreadView?.thread.updated_at ?? null)}</dd>
              </div>
            </dl>
          </section>

          <section className="thread-detail-section detail-text-section">
            <strong>Status</strong>
            <dl className="request-detail-list">
              <div>
                <dt>Current activity</dt>
                <dd>
                  {selectedThreadView?.current_activity.label ??
                    (isOpeningSelectedThread
                      ? "Opening"
                      : workspaceId
                        ? "Ready for first input"
                        : "Workspace required")}
                </dd>
              </div>
              <div>
                <dt>Activity summary</dt>
                <dd>
                  {workspaceId
                    ? threadActivitySummary
                    : "Choose a workspace to enable the composer."}
                </dd>
              </div>
              <div>
                <dt>Stream</dt>
                <dd>{connectionState}</dd>
              </div>
              <div>
                <dt>Composer</dt>
                <dd>
                  {selectedThreadView?.composer.accepting_user_input
                    ? "Accepting input"
                    : composerGuidance}
                </dd>
              </div>
            </dl>
          </section>

          <section className="thread-detail-section detail-text-section">
            <strong>Next action</strong>
            <p>{threadFeedback.summary}</p>
            {threadFeedback.actions.length > 0 ? (
              <div className="workspace-actions thread-feedback-actions">
                {threadFeedback.actions.map((action) => renderThreadFeedbackAction(action))}
              </div>
            ) : null}
          </section>

          <section className="thread-detail-section detail-text-section">
            <strong>Requests</strong>
            <p>
              {selectedThreadView?.pending_request
                ? selectedThreadView.pending_request.summary
                : selectedThreadView?.latest_resolved_request
                  ? `Latest resolved request: ${selectedThreadView.latest_resolved_request.decision}`
                  : "No pending or recently resolved request."}
            </p>
            {selectedRequestDetail ? (
              <button
                className="secondary-link action-button compact-button"
                onClick={onSelectRequestDetail}
                type="button"
              >
                Request detail
              </button>
            ) : null}
          </section>

          <section className="thread-detail-section detail-text-section">
            <strong>Artifacts</strong>
            {artifactRows.length > 0 ? (
              <ul className="detail-list">
                {artifactRows.map((row) => (
                  <li key={row.id}>
                    <strong>{row.label}</strong>
                    <span>{row.content}</span>
                    <button
                      className="secondary-link action-button inline-detail-button"
                      onClick={() => onSelectTimelineItemDetail(row.timelineItemId)}
                      type="button"
                    >
                      {row.detailActionLabel ?? "Inspect details"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No extracted artifacts are available for this thread yet.</p>
            )}
          </section>

          <details className="detail-debug">
            <summary>Debug: raw thread view JSON</summary>
            <pre className="detail-json">
              {JSON.stringify(selectedThreadView ?? { workspaceId, selectedThreadId }, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      {selection.kind === "request_detail" && selectedRequestDetail ? (
        <div className="detail-stack">
          <div className="workspace-meta-row">
            <span className={requestBadgeClass(selectedRequestDetail)}>
              {selectedRequestDetail.status}
            </span>
            <span className="status-badge">
              {formatMachineLabel(selectedRequestDetail.risk_category)}
            </span>
          </div>
          <p>{selectedRequestDetail.summary}</p>
          <dl className="request-detail-list">
            <div>
              <dt>Reason</dt>
              <dd>{selectedRequestDetail.reason}</dd>
            </div>
            {selectedRequestDetail.operation_summary ? (
              <div className={detailFieldClass("Operation")}>
                <dt>Operation</dt>
                <dd>
                  <code className="artifact-inline">{selectedRequestDetail.operation_summary}</code>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Requested</dt>
              <dd>{formatTimestamp(selectedRequestDetail.requested_at)}</dd>
            </div>
            <div className={`request-context-field ${detailFieldClass("Thread")}`}>
              <dt>Thread</dt>
              <dd>
                <code className="artifact-inline">{selectedRequestDetail.thread_id}</code>
              </dd>
            </div>
            <div className={`request-context-field ${detailFieldClass("Turn")}`}>
              <dt>Turn</dt>
              <dd>
                {selectedRequestDetail.turn_id ? (
                  <code className="artifact-inline">{selectedRequestDetail.turn_id}</code>
                ) : (
                  "Not available"
                )}
              </dd>
            </div>
            <div className={`request-context-field ${detailFieldClass("Item")}`}>
              <dt>Item</dt>
              <dd>
                <code className="artifact-inline">{selectedRequestDetail.item_id}</code>
              </dd>
            </div>
            {selectedRequestDetail.decision ? (
              <div>
                <dt>Decision</dt>
                <dd>{selectedRequestDetail.decision}</dd>
              </div>
            ) : null}
            {selectedRequestDetail.responded_at ? (
              <div>
                <dt>Responded</dt>
                <dd>{formatTimestamp(selectedRequestDetail.responded_at)}</dd>
              </div>
            ) : null}
          </dl>
          {selectedRequestDetail.operation_summary ? (
            <p className="request-operation-summary">
              Operation:{" "}
              <code className="artifact-inline">{selectedRequestDetail.operation_summary}</code>
            </p>
          ) : null}
          {selectedRequestDetail.status === "pending" ? (
            <div className="workspace-actions request-detail-actions">
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
            </div>
          ) : null}
        </div>
      ) : null}

      {selection.kind === "timeline_item_detail" &&
      selectedTimelineItem &&
      selectedTimelineItemDetail ? (
        <div className="detail-stack">
          <p className="workspace-meta">
            {selectedTimelineItem.kind} at {formatTimestamp(selectedTimelineItem.occurred_at)}
          </p>
          <p>{selectedTimelineItemDetail.summary}</p>
          {selectedTimelineItemDetail.sections.map((section) => (
            <div
              className={
                section.code
                  ? "request-operation-summary detail-artifact-section"
                  : "request-operation-summary detail-text-section"
              }
              key={section.title}
            >
              <strong>{section.title}</strong>
              <ul className={section.code ? "detail-list detail-artifact-list" : "detail-list"}>
                {section.items.map((entry) => (
                  <li key={entry}>
                    {section.code ? <code className="artifact-inline">{entry}</code> : entry}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {selectedTimelineItemDetail.fields.length > 0 ? (
            <dl className="request-detail-list">
              {selectedTimelineItemDetail.fields.map((field) => (
                <div
                  className={detailFieldClass(field.label)}
                  key={`${field.label}:${field.value}`}
                >
                  <dt>{field.label}</dt>
                  <dd>{renderDetailFieldValue(field)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <details className="detail-debug">
            <summary>Debug: raw timeline payload JSON</summary>
            <pre className="detail-json">
              {JSON.stringify(selectedTimelineItem.payload, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </aside>
  );
}
