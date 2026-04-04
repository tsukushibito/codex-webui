import React from "react";
import Link from "next/link";

import type {
  PublicApprovalDetail,
  PublicApprovalSummary,
} from "./approval-types";

export interface ApprovalViewProps {
  approvals: PublicApprovalSummary[];
  selectedApprovalId: string | null;
  selectedApproval: PublicApprovalDetail | null;
  isLoadingApprovals: boolean;
  isLoadingDetail: boolean;
  isSubmitting: boolean;
  connectionState: "idle" | "live" | "reconnecting";
  errorMessage: string | null;
  statusMessage: string | null;
  onSelectApproval: (approvalId: string) => void;
  onApprove: () => void;
  onDeny: () => void;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not resolved";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCategory(category: string) {
  return category.replaceAll("_", " ");
}

function workspaceChatHref(approval: PublicApprovalSummary | PublicApprovalDetail | null) {
  if (!approval) {
    return "/chat";
  }

  const params = new URLSearchParams({
    workspaceId: approval.workspace_id,
    sessionId: approval.session_id,
  });

  return `/chat?${params.toString()}`;
}

function contextEntries(context: Record<string, unknown> | null) {
  if (!context) {
    return [];
  }

  return Object.entries(context).map(([key, value]) => ({
    key,
    value:
      typeof value === "string"
        ? value
        : JSON.stringify(value),
  }));
}

export function ApprovalView({
  approvals,
  selectedApprovalId,
  selectedApproval,
  isLoadingApprovals,
  isLoadingDetail,
  isSubmitting,
  connectionState,
  errorMessage,
  statusMessage,
  onSelectApproval,
  onApprove,
  onDeny,
}: ApprovalViewProps) {
  const selectedSummary =
    approvals.find((approval) => approval.approval_id === selectedApprovalId) ?? null;
  const selectedItem = selectedApproval ?? selectedSummary;
  const canResolve = Boolean(selectedApproval && selectedApproval.status === "pending");

  return (
    <main className="chat-shell">
      <div className="chat-layout approval-layout">
        <section className="hero-card">
          <div className="hero-body">
            <p className="eyebrow">codex-webui</p>
            <h1>Approval</h1>
            <p className="hero-copy">
              Review the minimum confirmation information, then approve or deny
              the pending request from a smartphone-first queue.
            </p>
            <div className="hero-metrics">
              <span className="metric-chip">Pending: {approvals.length}</span>
              <span className="metric-chip">
                Stream: {connectionState === "live"
                  ? "live"
                  : connectionState === "reconnecting"
                    ? "reacquiring"
                    : "idle"}
              </span>
              <span className="metric-chip">
                Selected: {selectedItem?.approval_id ?? "none"}
              </span>
            </div>
            <div className="hero-actions">
              <Link className="secondary-link" href="/">
                Back to Home
              </Link>
              <Link className="primary-link" href={workspaceChatHref(selectedItem)}>
                Open related Chat
              </Link>
            </div>
          </div>
        </section>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

        <section className="chat-panel create-card">
          <header>
            <p className="eyebrow">Queue</p>
            <h2>Pending approvals</h2>
            <p className="field-hint">
              The list stays global. Select an item to reach the minimum
              confirmation information before acting.
            </p>
          </header>

          <div className="session-list approval-list">
            {isLoadingApprovals ? (
              <p className="workspace-status">Loading approval queue...</p>
            ) : null}

            {!isLoadingApprovals && approvals.length === 0 ? (
              <article className="workspace-card approval-empty-card">
                <p className="empty-state">
                  No pending approvals. New requests will appear here through the
                  queue refresh and approval stream.
                </p>
              </article>
            ) : null}

            {approvals.map((approval) => (
              <button
                className={
                  selectedApprovalId === approval.approval_id
                    ? "session-summary-card active"
                    : "session-summary-card"
                }
                key={approval.approval_id}
                onClick={() => onSelectApproval(approval.approval_id)}
                type="button"
              >
                <div className="workspace-meta-row">
                  <p className="eyebrow">Approval</p>
                  <span className="status-badge warning">
                    {formatCategory(approval.approval_category)}
                  </span>
                </div>
                <strong>{approval.title}</strong>
                <span className="workspace-status">{approval.description}</span>
                <span className="workspace-meta">
                  Requested {formatTimestamp(approval.requested_at)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="chat-panel workspace-card approval-detail-card">
          <header>
            <div className="workspace-meta-row">
              <p className="eyebrow">Detail</p>
              {selectedItem ? (
                <span className="status-badge warning">
                  {formatCategory(selectedItem.approval_category)}
                </span>
              ) : null}
            </div>
            <h2>{selectedItem?.title ?? "Select an approval"}</h2>
            <p className="workspace-meta">
              {selectedItem
                ? `Requested ${formatTimestamp(selectedItem.requested_at)}`
                : "Choose a pending approval from the queue to inspect it."}
            </p>
          </header>

          {isLoadingDetail && selectedItem ? (
            <p className="workspace-status">Refreshing approval detail...</p>
          ) : null}

          {!selectedItem ? (
            <p className="empty-state">
              The detail view shows the minimum confirmation information needed
              before approve or deny.
            </p>
          ) : (
            <>
              <div className="approval-detail-grid">
                <article className="chat-event">
                  <p className="eyebrow">Reason</p>
                  <p>{selectedItem.description}</p>
                </article>
                <article className="chat-event">
                  <p className="eyebrow">Operation summary</p>
                  <p>{selectedApproval?.operation_summary ?? "No operation summary"}</p>
                </article>
                <article className="chat-event">
                  <p className="eyebrow">Session / workspace</p>
                  <p>Session {selectedItem.session_id}</p>
                  <p>Workspace {selectedItem.workspace_id}</p>
                </article>
                <article className="chat-event">
                  <p className="eyebrow">Resolution</p>
                  <p>{selectedItem.resolution ?? "Still pending"}</p>
                  <p>Resolved {formatTimestamp(selectedItem.resolved_at)}</p>
                </article>
              </div>

              {selectedApproval?.context ? (
                <section className="approval-context">
                  <p className="eyebrow">Context</p>
                  <div className="approval-context-grid">
                    {contextEntries(selectedApproval.context).map((entry) => (
                      <div className="approval-context-row" key={entry.key}>
                        <span>{entry.key}</span>
                        <strong>{entry.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="workspace-actions">
                <button
                  className="primary-link action-button"
                  disabled={!canResolve || isSubmitting}
                  onClick={onApprove}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : "Approve request"}
                </button>
                <button
                  className="secondary-link action-button"
                  disabled={!canResolve || isSubmitting}
                  onClick={onDeny}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : "Deny request"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
