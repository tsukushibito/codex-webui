function splitAnswerText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function createApp(env = {}) {
  const doc = env.document || document;
  const fetchImpl = env.fetch || fetch;
  const EventSourceImpl = env.EventSource || EventSource;
  const autoStart = env.autoStart !== false;

  const state = {
    sessionId: null,
    threadId: null,
    eventSource: null,
    sending: false,
    messageById: new Map(),
    pendingApprovals: new Map(),
    pendingUserInputs: new Map(),
  };

  const els = {
    status: doc.getElementById("status"),
    sessionId: doc.getElementById("session-id"),
    messages: doc.getElementById("messages"),
    approvals: doc.getElementById("approvals"),
    userInputs: doc.getElementById("user-inputs"),
    composer: doc.getElementById("composer"),
    prompt: doc.getElementById("prompt"),
    send: doc.getElementById("send"),
  };

  function setStatus(text) {
    els.status.textContent = text;
  }

  function createElement(tagName, className, text) {
    const node = doc.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function appendMessage(kind, text, options = {}) {
    const node = createElement("article", `msg ${kind}`, text);

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
    els.approvals.classList.toggle("empty", approvals.length === 0);

    if (approvals.length === 0) {
      els.approvals.textContent = "No pending approvals.";
      return;
    }

    els.approvals.replaceChildren();

    for (const approval of approvals) {
      const card = createElement("article", "approval-card");
      const method = createElement("p", "approval-method", approval.method);
      const body = createElement(
        "pre",
        "approval-body",
        JSON.stringify(approval.params || {}, null, 2),
      );
      const actions = createElement("div", "approval-actions");

      for (const decision of ["allow", "deny", "cancel"]) {
        const button = createElement(
          "button",
          "",
          decision.charAt(0).toUpperCase() + decision.slice(1),
        );
        button.type = "button";
        button.dataset.decision = decision;
        button.addEventListener("click", async () => {
          try {
            await api("/api/approvals/respond", {
              sessionId: state.sessionId,
              requestId: approval.requestId,
              decision,
            });
            setStatus(`Approval resolved: ${approval.requestId}`);
          } catch (err) {
            setStatus(`Approval error: ${err.message}`);
          }
        });
        actions.appendChild(button);
      }

      card.dataset.requestId = approval.requestId;
      card.appendChild(method);
      card.appendChild(body);
      card.appendChild(actions);
      els.approvals.appendChild(card);
    }
  }

  function createUserInputQuestion(question, textareas) {
    const wrapper = createElement("section", "user-input-question");
    const title = createElement(
      "h3",
      "user-input-question-title",
      question.header || question.id || "Question",
    );
    const prompt = createElement("p", "user-input-question-body", question.question || "");
    const textarea = createElement("textarea", "user-input-answer");
    const options = Array.isArray(question.options) ? question.options : [];

    textarea.rows = 3;
    textarea.placeholder = "Enter one answer per line";
    textarea.dataset.questionId = question.id || "";

    wrapper.appendChild(title);
    if (prompt.textContent) {
      wrapper.appendChild(prompt);
    }

    if (options.length > 0) {
      const quickChoices = createElement("div", "user-input-options");
      for (const option of options) {
        const button = createElement("button", "user-input-option", option.label || "Option");
        button.type = "button";
        if (option.description) {
          button.title = option.description;
        }
        button.addEventListener("click", () => {
          textarea.value = option.label || "";
        });
        quickChoices.appendChild(button);
      }
      wrapper.appendChild(quickChoices);
    }

    wrapper.appendChild(textarea);
    textareas.push({ id: question.id, textarea });
    return wrapper;
  }

  function collectUserInputAnswers(textareas) {
    const answers = {};

    for (const entry of textareas) {
      if (!entry.id) {
        continue;
      }
      answers[entry.id] = splitAnswerText(entry.textarea.value);
    }

    return answers;
  }

  function renderUserInputs() {
    const requests = Array.from(state.pendingUserInputs.values());
    els.userInputs.classList.toggle("empty", requests.length === 0);

    if (requests.length === 0) {
      els.userInputs.textContent = "No pending user input requests.";
      return;
    }

    els.userInputs.replaceChildren();

    for (const request of requests) {
      const card = createElement("article", "user-input-card");
      const method = createElement("p", "user-input-method", request.method);
      const form = createElement("form", "user-input-form");
      const questions = Array.isArray(request.params?.questions) ? request.params.questions : [];
      const textareas = [];

      form.dataset.requestId = String(request.requestId);

      for (const question of questions) {
        form.appendChild(createUserInputQuestion(question || {}, textareas));
      }

      if (questions.length === 0) {
        form.appendChild(
          createElement(
            "p",
            "user-input-empty",
            "No structured questions were provided. Submit to acknowledge the request.",
          ),
        );
      }

      const actions = createElement("div", "user-input-actions");
      const submit = createElement("button", "user-input-submit", "Submit");
      submit.type = "submit";

      const skip = createElement("button", "user-input-skip", "Skip");
      skip.type = "button";
      skip.addEventListener("click", async () => {
        try {
          await api("/api/user-input/respond", {
            sessionId: state.sessionId,
            requestId: request.requestId,
            answers: {},
          });
          setStatus(`User input skipped: ${request.requestId}`);
        } catch (err) {
          setStatus(`User input error: ${err.message}`);
        }
      });

      actions.appendChild(submit);
      actions.appendChild(skip);
      form.appendChild(actions);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await api("/api/user-input/respond", {
            sessionId: state.sessionId,
            requestId: request.requestId,
            answers: collectUserInputAnswers(textareas),
          });
          setStatus(`User input resolved: ${request.requestId}`);
        } catch (err) {
          setStatus(`User input error: ${err.message}`);
        }
      });

      card.appendChild(method);
      card.appendChild(form);
      els.userInputs.appendChild(card);
    }
  }

  function syncPendingApprovals(approvals) {
    state.pendingApprovals.clear();
    for (const approval of approvals || []) {
      state.pendingApprovals.set(String(approval.requestId), approval);
    }
    renderApprovals();
  }

  function syncPendingUserInputs(requests) {
    state.pendingUserInputs.clear();
    for (const request of requests || []) {
      state.pendingUserInputs.set(String(request.requestId), request);
    }
    renderUserInputs();
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

  function applySessionSnapshot(payload) {
    state.threadId = payload.threadId || state.threadId;
    syncPendingApprovals(payload.pendingApprovals);
    syncPendingUserInputs(payload.pendingUserInputs);
    updateComposerState();
  }

  function handleApprovalPending(payload) {
    const approval = payload?.approval;
    if (!approval) {
      return;
    }
    state.pendingApprovals.set(String(approval.requestId), approval);
    renderApprovals();
    setStatus(`Approval requested: ${approval.method}`);
  }

  function handleApprovalResolved(payload) {
    const requestId = String(payload?.approval?.requestId || "");
    if (!requestId) {
      return;
    }
    state.pendingApprovals.delete(requestId);
    renderApprovals();
  }

  function handleApprovalTimedOut(payload) {
    const requestId = String(payload?.approval?.requestId || "");
    if (requestId) {
      state.pendingApprovals.delete(requestId);
      renderApprovals();
    }
    setStatus("An approval request timed out.");
  }

  function handleUserInputPending(payload) {
    const request = payload?.request;
    if (!request) {
      return;
    }
    state.pendingUserInputs.set(String(request.requestId), request);
    renderUserInputs();
    setStatus(`User input requested: ${request.method}`);
  }

  function handleUserInputResolved(payload) {
    const requestId = String(payload?.request?.requestId || "");
    if (!requestId) {
      return;
    }
    state.pendingUserInputs.delete(requestId);
    renderUserInputs();
  }

  function handleUserInputTimedOut(payload) {
    const requestId = String(payload?.request?.requestId || "");
    if (requestId) {
      state.pendingUserInputs.delete(requestId);
      renderUserInputs();
    }
    setStatus("A user input request timed out.");
  }

  function handleSessionClosed(payload) {
    setStatus(`Session closed: ${payload?.reason || "unknown"}`);
    state.sending = false;
    state.threadId = null;
    state.pendingApprovals.clear();
    state.pendingUserInputs.clear();
    renderApprovals();
    renderUserInputs();
    updateComposerState();
  }

  function connectSse() {
    const url = `/api/session/events?sessionId=${encodeURIComponent(state.sessionId)}`;
    const eventSource = new EventSourceImpl(url);
    state.eventSource = eventSource;

    eventSource.addEventListener("session/snapshot", (event) => {
      const payload = parseEventData(event);
      if (!payload) return;
      applySessionSnapshot(payload);
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
      handleApprovalPending(parseEventData(event));
    });

    eventSource.addEventListener("approval/resolved", (event) => {
      handleApprovalResolved(parseEventData(event));
    });

    eventSource.addEventListener("approval/timed_out", (event) => {
      handleApprovalTimedOut(parseEventData(event));
    });

    eventSource.addEventListener("user_input/pending", (event) => {
      handleUserInputPending(parseEventData(event));
    });

    eventSource.addEventListener("user_input/resolved", (event) => {
      handleUserInputResolved(parseEventData(event));
    });

    eventSource.addEventListener("user_input/timed_out", (event) => {
      handleUserInputTimedOut(parseEventData(event));
    });

    eventSource.addEventListener("session/closed", (event) => {
      handleSessionClosed(parseEventData(event));
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

  function bindComposer() {
    els.composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = els.prompt.value.trim();
      if (!text || state.sending || !state.threadId) {
        return;
      }
      els.prompt.value = "";
      await sendTurn(text);
    });
  }

  async function init() {
    updateComposerState();
    renderApprovals();
    renderUserInputs();
    bindComposer();

    if (autoStart) {
      await startSession();
    }
  }

  return {
    state,
    els,
    init,
    api,
    applySessionSnapshot,
    handleUserInputPending,
    handleUserInputResolved,
    handleUserInputTimedOut,
    renderUserInputs,
    splitAnswerText,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createApp,
    splitAnswerText,
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const app = createApp();
  window.codexWebUiApp = app;
  app.init().catch((err) => {
    app.els.status.textContent = `Startup failed: ${err.message}`;
    app.els.messages.appendChild(
      Object.assign(document.createElement("article"), {
        className: "msg system",
        textContent: `Startup failed: ${err.message}`,
      }),
    );
  });
}
