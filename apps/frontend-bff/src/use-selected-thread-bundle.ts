"use client";

import { useEffect, useRef, useState } from "react";

import { loadChatThreadBundle } from "./chat-data";
import { logLiveChatDebug } from "./debug";
import type { PublicRequestDetail, PublicThreadView } from "./thread-types";

type SelectedThreadBundle = Awaited<ReturnType<typeof loadChatThreadBundle>>;

function selectRequestDetail(bundle: {
  latestResolvedRequestDetail?: PublicRequestDetail | null;
  pendingRequestDetail: PublicRequestDetail | null;
}) {
  return bundle.pendingRequestDetail ?? bundle.latestResolvedRequestDetail ?? null;
}

interface UseSelectedThreadBundleOptions {
  selectedThreadId: string | null;
  onLoadStart?: () => void;
  onLoadError?: (message: string) => void;
}

export function useSelectedThreadBundle({
  selectedThreadId,
  onLoadStart,
  onLoadError,
}: UseSelectedThreadBundleOptions) {
  const [selectedThreadView, setSelectedThreadView] = useState<PublicThreadView | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<PublicRequestDetail | null>(
    null,
  );
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const selectedThreadRefreshIdRef = useRef(0);

  function clearSelectedThreadBundle() {
    selectedThreadRefreshIdRef.current += 1;
    setSelectedThreadView(null);
    setSelectedRequestDetail(null);
    setIsLoadingThread(false);
  }

  async function refreshSelectedThreadBundle(threadId: string | null = selectedThreadId) {
    if (!threadId) {
      clearSelectedThreadBundle();
      return null;
    }

    const refreshId = selectedThreadRefreshIdRef.current + 1;
    selectedThreadRefreshIdRef.current = refreshId;
    setIsLoadingThread(true);
    onLoadStart?.();
    logLiveChatDebug("chat-refresh", "refreshing selected thread bundle", {
      thread_id: threadId,
      refresh_id: refreshId,
    });

    try {
      const bundle = await loadChatThreadBundle(threadId);
      if (selectedThreadRefreshIdRef.current !== refreshId) {
        logLiveChatDebug("chat-refresh", "discarding stale selected thread bundle", {
          thread_id: threadId,
          refresh_id: refreshId,
        });
        return null;
      }

      setSelectedThreadView(bundle.view);
      setSelectedRequestDetail(selectRequestDetail(bundle));
      return bundle satisfies SelectedThreadBundle;
    } catch (error) {
      if (selectedThreadRefreshIdRef.current === refreshId) {
        logLiveChatDebug("chat-refresh", "failed to load selected thread bundle", {
          thread_id: threadId,
          refresh_id: refreshId,
          error: error instanceof Error ? error.message : String(error),
        });
        onLoadError?.(
          error instanceof Error ? error.message : "Failed to load the selected thread.",
        );
      }
      return null;
    } finally {
      if (selectedThreadRefreshIdRef.current === refreshId) {
        setIsLoadingThread(false);
      }
    }
  }

  useEffect(() => {
    logLiveChatDebug("chat-stream", "selectedThreadId effect fired", {
      thread_id: selectedThreadId,
    });

    if (!selectedThreadId) {
      logLiveChatDebug("chat-stream", "selected thread cleared", {
        previous_thread_id: selectedThreadView?.thread.thread_id ?? null,
      });
      clearSelectedThreadBundle();
      return;
    }

    logLiveChatDebug("chat-stream", "selected thread changed", {
      thread_id: selectedThreadId,
      previous_thread_id: selectedThreadView?.thread.thread_id ?? null,
    });
    void refreshSelectedThreadBundle(selectedThreadId);
  }, [selectedThreadId]);

  return {
    isLoadingThread,
    selectedRequestDetail,
    selectedThreadView,
    clearSelectedThreadBundle,
    refreshSelectedThreadBundle,
  };
}
