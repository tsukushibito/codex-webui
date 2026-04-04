"use client";

import { useEffect, useRef, useState } from "react";

import {
  approveApproval,
  denyApproval,
  fetchApprovalDetail,
  fetchPendingApprovals,
} from "./approval-data";
import type {
  PublicApprovalDetail,
  PublicApprovalStreamEvent,
  PublicApprovalSummary,
} from "./approval-types";
import { ApprovalView } from "./approval-view";

function pickSelection(
  approvals: PublicApprovalSummary[],
  preferredApprovalId: string | null,
  currentApprovalId: string | null,
) {
  if (
    preferredApprovalId &&
    approvals.some((approval) => approval.approval_id === preferredApprovalId)
  ) {
    return preferredApprovalId;
  }

  if (
    currentApprovalId &&
    approvals.some((approval) => approval.approval_id === currentApprovalId)
  ) {
    return currentApprovalId;
  }

  return approvals[0]?.approval_id ?? null;
}

export function ApprovalPageClient() {
  const [approvals, setApprovals] = useState<PublicApprovalSummary[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<PublicApprovalDetail | null>(
    null,
  );
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "idle" | "live" | "reconnecting"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [streamVersion, setStreamVersion] = useState(0);
  const selectedApprovalIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    selectedApprovalIdRef.current = selectedApprovalId;
  }, [selectedApprovalId]);

  async function loadApprovalDetail(approvalId: string) {
    setIsLoadingDetail(true);

    try {
      setSelectedApproval(await fetchApprovalDetail(approvalId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load the approval detail.",
      );
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function loadApprovals(preferredApprovalId: string | null = null) {
    setIsLoadingApprovals(true);
    setErrorMessage(null);

    try {
      const response = await fetchPendingApprovals();
      setApprovals(response.items);

      const nextSelectedId = pickSelection(
        response.items,
        preferredApprovalId,
        selectedApprovalIdRef.current,
      );

      setSelectedApprovalId(nextSelectedId);
      if (nextSelectedId) {
        await loadApprovalDetail(nextSelectedId);
      } else {
        setSelectedApproval(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load the approval queue.",
      );
    } finally {
      setIsLoadingApprovals(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, []);

  useEffect(() => {
    const stream = new EventSource("/api/v1/approvals/stream");
    setConnectionState("live");

    stream.onmessage = (messageEvent) => {
      const event = JSON.parse(messageEvent.data) as PublicApprovalStreamEvent;
      const approvalId =
        typeof event.payload.approval_id === "string" ? event.payload.approval_id : null;

      if (event.event_type === "approval.requested") {
        setStatusMessage("New approval requested. Queue refreshed.");
        void loadApprovals(approvalId);
        return;
      }

      if (event.event_type === "approval.resolved") {
        setStatusMessage("Approval resolved. Queue refreshed.");
        void loadApprovals(selectedApprovalIdRef.current);
      }
    };

    stream.onerror = () => {
      stream.close();
      setConnectionState("reconnecting");
      void loadApprovals(selectedApprovalIdRef.current).finally(() => {
        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
        }

        reconnectTimerRef.current = window.setTimeout(() => {
          setStreamVersion((currentValue) => currentValue + 1);
        }, 1000);
      });
    };

    return () => {
      stream.close();
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [streamVersion]);

  async function handleSelectApproval(approvalId: string) {
    setSelectedApprovalId(approvalId);
    setErrorMessage(null);
    await loadApprovalDetail(approvalId);
  }

  async function handleResolveApproval(resolution: "approved" | "denied") {
    if (!selectedApprovalId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result =
        resolution === "approved"
          ? await approveApproval(selectedApprovalId)
          : await denyApproval(selectedApprovalId);

      setStatusMessage(
        resolution === "approved"
          ? `Approved ${result.approval.approval_id}. Session ${result.session.status}.`
          : `Denied ${result.approval.approval_id}. Session ${result.session.status}.`,
      );
      await loadApprovals();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to resolve the approval.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ApprovalView
      approvals={approvals}
      connectionState={connectionState}
      errorMessage={errorMessage}
      isLoadingApprovals={isLoadingApprovals}
      isLoadingDetail={isLoadingDetail}
      isSubmitting={isSubmitting}
      onApprove={() => void handleResolveApproval("approved")}
      onDeny={() => void handleResolveApproval("denied")}
      onSelectApproval={(approvalId) => {
        void handleSelectApproval(approvalId);
      }}
      selectedApproval={selectedApproval}
      selectedApprovalId={selectedApprovalId}
      statusMessage={statusMessage}
    />
  );
}
