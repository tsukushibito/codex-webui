const state = {
  sessionId: null,
  threadId: null,
  eventSource: null,
  sending: false,
  messageById: new Map(),
  pendingApprovals: new Map(),
};

const els = {
  status: document.getElementById("status"),
  sessionId: document.getElementById("session-id"),
  messages: document.getElementById("messages"),
  approvals: document.getElementById("approvals"),
  composer: document.getElementById("composer"),
  prompt: document.getElementById("prompt"),
  send: document.getElementById("send"),
  approvalTemplate: document.getElementById("approval-template"),
};

function setStatus(text) {
  els.status.textContent = text;
}

function appendMessage(kind, text, options = {}) {
  const node = document.createElement("article");
  node.className = `msg ${kind}`;
  node.textContent = text;

  if (options.itemId) {
    node.dataset.itemId = options.itemId;
    state.messageById.set(options.itemId, node);
  }

  els.messages.appendChild(node);
  els.messages.scrollTop = els.messages.scrollHeight;
  return node;
}

function updateComposerState() {
  els.send.disabled = state.sending || !state.threadId;
}

async function api(path, payload, method = "POST") {
  const options = { method, headers: {} };
  if (method !== "GET") {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify(payload || {});
  }

  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body;
}

function extractThreadIdFromResult(result) {
  if (result?.thread?.id) return result.thread.id;
  return null;
}

function parseEventData(event) {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

function renderApprovals() {
  const approvals = Array.from(state.pendingApprovals.values());
  if (approvals.length === 0) {
    els.approvals.classList.add("empty");
    els.approvals.textContent = "No pending approvals.";
    return;
  }

  els.approvals.classList.remove("empty");
  els.approvals.textContent = "";

  for (const approval of approvals) {
    const fragment = els.approvalTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".approval-card");
    const method = fragment.querySelector(".approval-method");
    const body = fragment.querySelector(".approval-body");

    method.textContent = approval.method;
    body.textContent = JSON.stringify(approval.params || {}, null, 2);

    for (const button of fragment.querySelectorAll("button[data-decision]")) {
      button.addEventListener("click", async () => {
        try {
          await api("/api/approvals/respond", {
            sessionId: state.sessionId,
            requestId: approval.requestId,
            decision: button.dataset.decision,
          });
          setStatus(`Approval resolved: ${approval.requestId}`);
        } catch (err) {
          setStatus(`Approval error: ${err.message}`);
        }
      });
    }

    card.dataset.requestId = approval.requestId;
    els.approvals.appendChild(fragment);
  }
}

function handleRpcNotification(message) {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.method === "thread/started") {
    const threadId = message.params?.thread?.id;
    if (threadId) {
      state.threadId = threadId;
      setStatus(`Thread ready: ${threadId}`);
      updateComposerState();
    }
    return;
  }

  if (message.method === "item/started" && message.params?.item?.type === "agentMessage") {
    const itemId = message.params.item.id;
    if (itemId && !state.messageById.has(itemId)) {
      appendMessage("assistant", "", { itemId });
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
    updateComposerState();
    setStatus("Turn completed.");
    return;
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
    node = appendMessage("assistant", "", { itemId });
  }
  node.textContent += delta;
  els.messages.scrollTop = els.messages.scrollHeight;
}

function connectSse() {
  const url = `/api/session/events?sessionId=${encodeURIComponent(state.sessionId)}`;
  const eventSource = new EventSource(url);
  state.eventSource = eventSource;

  eventSource.addEventListener("session/snapshot", (event) => {
    const payload = parseEventData(event);
    if (!payload) return;
    state.threadId = payload.threadId || state.threadId;
    state.pendingApprovals.clear();
    for (const approval of payload.pendingApprovals || []) {
      state.pendingApprovals.set(String(approval.requestId), approval);
    }
    renderApprovals();
    updateComposerState();
  });

  eventSource.addEventListener("rpc/notification", (event) => {
    const payload = parseEventData(event);
    handleRpcNotification(payload?.message);
  });

  eventSource.addEventListener("chat/delta", (event) => {
    const payload = parseEventData(event);
    handleDelta(payload?.params || {});
  });

  eventSource.addEventListener("approval/pending", (event) => {
    const payload = parseEventData(event);
    const approval = payload?.approval;
    if (!approval) return;
    state.pendingApprovals.set(String(approval.requestId), approval);
    renderApprovals();
    setStatus(`Approval requested: ${approval.method}`);
  });

  eventSource.addEventListener("approval/resolved", (event) => {
    const payload = parseEventData(event);
    const requestId = String(payload?.approval?.requestId || "");
    if (!requestId) return;
    state.pendingApprovals.delete(requestId);
    renderApprovals();
  });

  eventSource.addEventListener("approval/timed_out", (event) => {
    const payload = parseEventData(event);
    const requestId = String(payload?.approval?.requestId || "");
    if (requestId) {
      state.pendingApprovals.delete(requestId);
      renderApprovals();
    }
    setStatus("An approval request timed out.");
  });

  eventSource.addEventListener("session/closed", (event) => {
    const payload = parseEventData(event);
    setStatus(`Session closed: ${payload?.reason || "unknown"}`);
    state.sending = false;
    state.threadId = null;
    updateComposerState();
  });

  eventSource.onerror = () => {
    setStatus("SSE disconnected. Refresh to reconnect.");
  };
}

async function startSession() {
  setStatus("Starting session...");
  const session = await api("/api/session/start", {});
  state.sessionId = session.sessionId;
  els.sessionId.textContent = state.sessionId;

  connectSse();

  setStatus("Creating thread...");
  const thread = await api("/api/thread/start", {
    sessionId: state.sessionId,
    params: {},
  });

  state.threadId = extractThreadIdFromResult(thread.result);
  updateComposerState();

  if (state.threadId) {
    setStatus(`Ready. Thread: ${state.threadId}`);
    appendMessage("system", "Session ready. Start chatting.");
  } else {
    setStatus("Ready, but thread ID is missing.");
  }
}

async function sendTurn(text) {
  state.sending = true;
  updateComposerState();

  appendMessage("user", text);
  try {
    await api("/api/turn/start", {
      sessionId: state.sessionId,
      threadId: state.threadId,
      prompt: text,
    });
    setStatus("Turn started...");
  } catch (err) {
    state.sending = false;
    updateComposerState();
    setStatus(`Turn error: ${err.message}`);
  }
}

els.composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = els.prompt.value.trim();
  if (!text || state.sending || !state.threadId) {
    return;
  }
  els.prompt.value = "";
  await sendTurn(text);
});

updateComposerState();
startSession().catch((err) => {
  setStatus(`Startup failed: ${err.message}`);
  appendMessage("system", `Startup failed: ${err.message}`);
});
