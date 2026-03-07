(function initCodexWebUiSession(factory) {
  const exported = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.CodexWebUi = globalThis.CodexWebUi || {};
    Object.assign(globalThis.CodexWebUi, exported);
  }
})(function buildCodexWebUiSession() {
  const transport = typeof require === "function"
    ? require("./app-transport.js")
    : globalThis.CodexWebUi;

  const { connectSessionEvents } = transport;
  const SESSION_STORAGE_KEY = "codex-webui.sessionId";

  function createStorageFacade(storage) {
    function loadPersistedSessionId() {
      try {
        return String(storage.getItem(SESSION_STORAGE_KEY) || "").trim() || null;
      } catch {
        return null;
      }
    }

    function persistSessionId(sessionId) {
      try {
        storage.setItem(SESSION_STORAGE_KEY, String(sessionId || ""));
      } catch {
        // Ignore storage failures; reconnect is best-effort.
      }
    }

    function clearPersistedSessionId() {
      try {
        storage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage failures; reconnect is best-effort.
      }
    }

    return {
      clearPersistedSessionId,
      loadPersistedSessionId,
      persistSessionId,
    };
  }

  function createSessionController(options) {
    const {
      EventSourceImpl,
      api,
      render,
      state,
      storage,
    } = options;

    const storageFacade = createStorageFacade(storage);

    function setSessionId(sessionId) {
      state.sessionId = sessionId ? String(sessionId) : null;
      render.setSessionId(state.sessionId);
      if (state.sessionId) {
        storageFacade.persistSessionId(state.sessionId);
      } else {
        storageFacade.clearPersistedSessionId();
      }
    }

    function extractThreadIdFromResult(result) {
      if (result?.thread?.id) {
        return result.thread.id;
      }
      return null;
    }

    function extractUserMessageText(item) {
      const parts = [];
      for (const contentItem of item?.content || []) {
        if (contentItem?.type === "text" && typeof contentItem.text === "string") {
          parts.push(contentItem.text);
        }
      }
      return parts.join("\n").trim();
    }

    function rebuildTranscriptFromThread(thread) {
      render.clearMessages();

      const turns = Array.isArray(thread?.turns) ? thread.turns : [];
      for (const turn of turns) {
        for (const item of turn?.items || []) {
          if (!item || typeof item !== "object") {
            continue;
          }

          if (item.type === "userMessage") {
            const text = extractUserMessageText(item);
            if (text) {
              render.appendMessage("user", text, { itemId: item.id });
            }
            continue;
          }

          if (item.type === "agentMessage" && typeof item.text === "string") {
            render.appendMessage("assistant", item.text, { itemId: item.id });
          }
        }
      }
    }

    function syncPendingApprovals(approvals) {
      state.pendingApprovals.clear();
      for (const approval of approvals || []) {
        state.pendingApprovals.set(String(approval.requestId), approval);
      }
      render.renderApprovals();
    }

    function syncPendingUserInputs(requests) {
      state.pendingUserInputs.clear();
      for (const request of requests || []) {
        state.pendingUserInputs.set(String(request.requestId), request);
      }
      render.renderUserInputs();
    }

    function applySessionSnapshot(payload) {
      state.threadId = payload.threadId || state.threadId;
      syncPendingApprovals(payload.pendingApprovals);
      syncPendingUserInputs(payload.pendingUserInputs);
      render.updateComposerState();
    }

    function handleRpcNotification(message) {
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.method === "thread/started") {
        const threadId = message.params?.thread?.id;
        if (threadId) {
          state.threadId = threadId;
          render.setStatus(`Thread ready: ${threadId}`);
          render.updateComposerState();
        }
        return;
      }

      if (message.method === "item/started" && message.params?.item?.type === "agentMessage") {
        const itemId = message.params.item.id;
        if (itemId && !state.messageById.has(itemId)) {
          render.appendMessage("assistant", "", { itemId });
        }
        return;
      }

      if (message.method === "item/completed" && message.params?.item?.type === "agentMessage") {
        const itemId = message.params.item.id;
        const text = message.params.item.text || "";
        const node = state.messageById.get(itemId);
        if (node) {
          node.textContent = text;
        }
        return;
      }

      if (message.method === "turn/completed") {
        state.sending = false;
        render.updateComposerState();
        render.setStatus("Turn completed.");
      }
    }

    function handleDelta(params) {
      const itemId = params?.itemId;
      const delta = params?.delta || "";
      if (!itemId || typeof delta !== "string") {
        return;
      }

      let node = state.messageById.get(itemId);
      if (!node) {
        node = render.appendMessage("assistant", "", { itemId });
      }
      node.textContent += delta;
    }

    function handleApprovalPending(payload) {
      const approval = payload?.approval;
      if (!approval) {
        return;
      }
      state.pendingApprovals.set(String(approval.requestId), approval);
      render.renderApprovals();
      render.setStatus(`Approval requested: ${approval.method}`);
    }

    function handleApprovalResolved(payload) {
      const requestId = String(payload?.approval?.requestId || "");
      if (!requestId) {
        return;
      }
      state.pendingApprovals.delete(requestId);
      render.renderApprovals();
    }

    function handleApprovalTimedOut(payload) {
      const requestId = String(payload?.approval?.requestId || "");
      if (requestId) {
        state.pendingApprovals.delete(requestId);
        render.renderApprovals();
      }
      render.setStatus("An approval request timed out.");
    }

    function handleUserInputPending(payload) {
      const request = payload?.request;
      if (!request) {
        return;
      }
      state.pendingUserInputs.set(String(request.requestId), request);
      render.renderUserInputs();
      render.setStatus(`User input requested: ${request.method}`);
    }

    function handleUserInputResolved(payload) {
      const requestId = String(payload?.request?.requestId || "");
      if (!requestId) {
        return;
      }
      state.pendingUserInputs.delete(requestId);
      render.renderUserInputs();
    }

    function handleUserInputTimedOut(payload) {
      const requestId = String(payload?.request?.requestId || "");
      if (requestId) {
        state.pendingUserInputs.delete(requestId);
        render.renderUserInputs();
      }
      render.setStatus("A user input request timed out.");
    }

    function handleSessionClosed(payload) {
      render.setStatus(`Session closed: ${payload?.reason || "unknown"}`);
      state.sending = false;
      state.threadId = null;
      setSessionId(null);
      state.pendingApprovals.clear();
      state.pendingUserInputs.clear();
      render.renderApprovals();
      render.renderUserInputs();
      render.updateComposerState();
    }

    function connectSse() {
      if (state.eventSource && typeof state.eventSource.close === "function") {
        state.eventSource.close();
      }

      state.eventSource = connectSessionEvents({
        EventSourceImpl,
        sessionId: state.sessionId,
        onSnapshot: applySessionSnapshot,
        onRpcNotification: handleRpcNotification,
        onDelta: handleDelta,
        onApprovalPending: handleApprovalPending,
        onApprovalResolved: handleApprovalResolved,
        onApprovalTimedOut: handleApprovalTimedOut,
        onUserInputPending: handleUserInputPending,
        onUserInputResolved: handleUserInputResolved,
        onUserInputTimedOut: handleUserInputTimedOut,
        onSessionClosed: handleSessionClosed,
        onError() {
          render.setStatus("SSE disconnected. Reconnecting if the session is still alive.");
        },
      });
    }

    async function resyncThreadTranscript() {
      if (!state.sessionId || !state.threadId) {
        return;
      }

      const response = await api("/api/thread/read", {
        sessionId: state.sessionId,
        threadId: state.threadId,
        includeTurns: true,
      });
      rebuildTranscriptFromThread(response.result?.thread || null);
    }

    async function reconnectSession(sessionId) {
      const reconnect = await api("/api/session/reconnect", {
        sessionId,
      });

      setSessionId(reconnect.sessionId);
      applySessionSnapshot(reconnect);
      connectSse();

      if (!state.threadId) {
        render.setStatus("Reconnected. Waiting for a thread to start.");
        return true;
      }

      try {
        await resyncThreadTranscript();
        render.setStatus(`Reconnected. Thread: ${state.threadId}`);
      } catch (err) {
        render.setStatus(`Reconnected, but transcript sync failed: ${err.message}`);
      }

      return true;
    }

    async function startSession() {
      render.setStatus("Starting session...");
      const session = await api("/api/session/start", {});
      setSessionId(session.sessionId);

      connectSse();

      render.setStatus("Creating thread...");
      const thread = await api("/api/thread/start", {
        sessionId: state.sessionId,
        params: {},
      });

      state.threadId = extractThreadIdFromResult(thread.result);
      render.updateComposerState();

      if (state.threadId) {
        render.setStatus(`Ready. Thread: ${state.threadId}`);
        render.appendMessage("system", "Session ready. Start chatting.");
      } else {
        render.setStatus("Ready, but thread ID is missing.");
      }
    }

    async function bootstrapSession() {
      const storedSessionId = storageFacade.loadPersistedSessionId();
      if (storedSessionId) {
        try {
          await reconnectSession(storedSessionId);
          return;
        } catch (err) {
          storageFacade.clearPersistedSessionId();
          render.setStatus(`Reconnect failed: ${err.message}. Starting a new session...`);
        }
      }

      await startSession();
    }

    async function sendTurn(text) {
      state.sending = true;
      render.updateComposerState();

      render.appendMessage("user", text);
      try {
        await api("/api/turn/start", {
          sessionId: state.sessionId,
          threadId: state.threadId,
          prompt: text,
        });
        render.setStatus("Turn started...");
      } catch (err) {
        state.sending = false;
        render.updateComposerState();
        render.setStatus(`Turn error: ${err.message}`);
      }
    }

    return {
      applySessionSnapshot,
      bootstrapSession,
      handleUserInputPending,
      handleUserInputResolved,
      handleUserInputTimedOut,
      rebuildTranscriptFromThread,
      reconnectSession,
      sendTurn,
      setSessionId,
      startSession,
    };
  }

  return {
    createSessionController,
    SESSION_STORAGE_KEY,
  };
});
