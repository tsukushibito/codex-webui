(function initCodexWebUiTransport(factory) {
  const exported = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.CodexWebUi = globalThis.CodexWebUi || {};
    Object.assign(globalThis.CodexWebUi, exported);
  }
})(function buildCodexWebUiTransport() {
  function parseEventData(event) {
    try {
      return JSON.parse(event.data);
    } catch {
      return null;
    }
  }

  function createApiClient(fetchImpl) {
    async function api(requestPath, payload, method = "POST") {
      const options = { method, headers: {} };
      if (method !== "GET") {
        options.headers["content-type"] = "application/json";
        options.body = JSON.stringify(payload || {});
      }

      const response = await fetchImpl(requestPath, options);
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      return body;
    }

    return {
      api,
    };
  }

  function connectSessionEvents(options) {
    const {
      EventSourceImpl,
      sessionId,
      onSnapshot,
      onRpcNotification,
      onDelta,
      onApprovalPending,
      onApprovalResolved,
      onApprovalTimedOut,
      onUserInputPending,
      onUserInputResolved,
      onUserInputTimedOut,
      onSessionClosed,
      onError,
    } = options;

    const url = `/api/session/events?sessionId=${encodeURIComponent(sessionId)}`;
    const eventSource = new EventSourceImpl(url);

    eventSource.addEventListener("session/snapshot", (event) => {
      if (typeof onSnapshot === "function") {
        onSnapshot(parseEventData(event));
      }
    });

    eventSource.addEventListener("rpc/notification", (event) => {
      const payload = parseEventData(event);
      if (typeof onRpcNotification === "function") {
        onRpcNotification(payload?.message || null);
      }
    });

    eventSource.addEventListener("chat/delta", (event) => {
      const payload = parseEventData(event);
      if (typeof onDelta === "function") {
        onDelta(payload?.params || {});
      }
    });

    eventSource.addEventListener("approval/pending", (event) => {
      if (typeof onApprovalPending === "function") {
        onApprovalPending(parseEventData(event));
      }
    });

    eventSource.addEventListener("approval/resolved", (event) => {
      if (typeof onApprovalResolved === "function") {
        onApprovalResolved(parseEventData(event));
      }
    });

    eventSource.addEventListener("approval/timed_out", (event) => {
      if (typeof onApprovalTimedOut === "function") {
        onApprovalTimedOut(parseEventData(event));
      }
    });

    eventSource.addEventListener("user_input/pending", (event) => {
      if (typeof onUserInputPending === "function") {
        onUserInputPending(parseEventData(event));
      }
    });

    eventSource.addEventListener("user_input/resolved", (event) => {
      if (typeof onUserInputResolved === "function") {
        onUserInputResolved(parseEventData(event));
      }
    });

    eventSource.addEventListener("user_input/timed_out", (event) => {
      if (typeof onUserInputTimedOut === "function") {
        onUserInputTimedOut(parseEventData(event));
      }
    });

    eventSource.addEventListener("session/closed", (event) => {
      if (typeof onSessionClosed === "function") {
        onSessionClosed(parseEventData(event));
      }
    });

    eventSource.onerror = () => {
      if (typeof onError === "function") {
        onError();
      }
    };

    return eventSource;
  }

  return {
    connectSessionEvents,
    createApiClient,
    parseEventData,
  };
});
