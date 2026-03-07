function splitAnswerText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

const SESSION_STORAGE_KEY = "codex-webui.sessionId";

function createApp(env = {}) {
  const doc = env.document || document;
  const fetchImpl = env.fetch || fetch;
  const EventSourceImpl = env.EventSource || EventSource;
  const storage = env.storage || (
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : {
        getItem() {
          return null;
        },
        setItem() {},
        removeItem() {},
      }
  );
  const autoStart = env.autoStart !== false;

  const state = {
    sessionId: null,
    threadId: null,
    eventSource: null,
    sending: false,
    messageById: new Map(),
    pendingApprovals: new Map(),
    pendingUserInputs: new Map(),
    workspaceTree: [],
    selectedPath: null,
    selectedFile: null,
    selectedDiff: null,
    selectedEntry: null,
    filePreviewError: "",
    diffError: "",
    loadingWorkspaceTree: false,
    loadingSelection: false,
    activePane: "chat",
    selectionRequestToken: 0,
  };

  const els = {
    shell: doc.getElementById("shell"),
    status: doc.getElementById("status"),
    sessionId: doc.getElementById("session-id"),
    messages: doc.getElementById("messages"),
    workspaceTree: doc.getElementById("workspace-tree"),
    selectedPath: doc.getElementById("selected-path"),
    filePreview: doc.getElementById("file-preview"),
    diffView: doc.getElementById("diff-view"),
    approvals: doc.getElementById("approvals"),
    userInputs: doc.getElementById("user-inputs"),
    composer: doc.getElementById("composer"),
    prompt: doc.getElementById("prompt"),
    send: doc.getElementById("send"),
    tabChat: doc.getElementById("tab-chat"),
    tabFiles: doc.getElementById("tab-files"),
    tabDiff: doc.getElementById("tab-diff"),
  };

  function setStatus(text) {
    els.status.textContent = text;
  }

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

  function setSessionId(sessionId) {
    state.sessionId = sessionId ? String(sessionId) : null;
    els.sessionId.textContent = state.sessionId || "-";
    if (state.sessionId) {
      persistSessionId(state.sessionId);
    } else {
      clearPersistedSessionId();
    }
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

  function clearMessages() {
    state.messageById.clear();
    els.messages.replaceChildren();
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

  function findFirstFileNode(nodes) {
    for (const node of nodes || []) {
      if (node.type === "file") {
        return node;
      }
      if (node.type === "directory") {
        const nested = findFirstFileNode(node.children || []);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  }

  function findEntryByPath(nodes, targetPath) {
    for (const node of nodes || []) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.type === "directory") {
        const nested = findEntryByPath(node.children || [], targetPath);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  }

  function describeGitStatus(code) {
    const trimmed = String(code || "").trim();
    return trimmed || "clean";
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
    clearMessages();

    const turns = Array.isArray(thread?.turns) ? thread.turns : [];
    for (const turn of turns) {
      for (const item of turn?.items || []) {
        if (!item || typeof item !== "object") {
          continue;
        }

        if (item.type === "userMessage") {
          const text = extractUserMessageText(item);
          if (text) {
            appendMessage("user", text, { itemId: item.id });
          }
          continue;
        }

        if (item.type === "agentMessage" && typeof item.text === "string") {
          appendMessage("assistant", item.text, { itemId: item.id });
        }
      }
    }
  }

  function setActivePane(pane) {
    state.activePane = pane;
    if (els.shell) {
      els.shell.dataset.activePane = pane;
    }

    const tabMap = [
      [els.tabChat, "chat"],
      [els.tabFiles, "files"],
      [els.tabDiff, "diff"],
    ];
    for (const [button, buttonPane] of tabMap) {
      if (!button) {
        continue;
      }
      button.classList.toggle("is-active", buttonPane === pane);
    }
  }

  function renderWorkspaceTreeNodes(nodes, container, depth) {
    for (const node of nodes || []) {
      if (node.type === "directory") {
        const directory = createElement("section", "tree-directory");
        const label = createElement("div", "tree-directory-label", node.name);
        label.dataset.depth = String(depth);

        const children = createElement("div", "tree-children");
        children.dataset.depth = String(depth + 1);

        directory.appendChild(label);
        renderWorkspaceTreeNodes(node.children || [], children, depth + 1);
        directory.appendChild(children);
        container.appendChild(directory);
        continue;
      }

      const button = createElement("button", "tree-file");
      const name = createElement("span", "tree-file-name", node.name);
      const status = createElement("span", "tree-file-status", describeGitStatus(node.gitStatus));

      button.type = "button";
      button.dataset.path = node.path;
      button.dataset.depth = String(depth);
      button.classList.toggle("is-selected", node.path === state.selectedPath);
      button.addEventListener("click", async () => {
        await selectPath(node.path);
        setActivePane("diff");
      });

      button.appendChild(name);
      button.appendChild(status);
      container.appendChild(button);
    }
  }

  function renderWorkspaceTree() {
    const nodes = state.workspaceTree || [];
    els.workspaceTree.classList.toggle("empty", nodes.length === 0);

    if (state.loadingWorkspaceTree) {
      els.workspaceTree.textContent = "Loading files...";
      return;
    }

    if (nodes.length === 0) {
      els.workspaceTree.textContent = "No files available.";
      return;
    }

    els.workspaceTree.replaceChildren();
    renderWorkspaceTreeNodes(nodes, els.workspaceTree, 0);
  }

  function renderFilePreview() {
    els.filePreview.classList.toggle("empty", !state.selectedPath || state.loadingSelection);

    if (!state.selectedPath) {
      els.selectedPath.textContent = "Select a file to inspect.";
      els.filePreview.textContent = "Select a file from the tree to inspect its workspace contents.";
      return;
    }

    els.selectedPath.textContent = state.selectedPath;

    if (state.loadingSelection) {
      els.filePreview.textContent = `Loading workspace file for ${state.selectedPath}...`;
      return;
    }

    if (state.filePreviewError) {
      els.filePreview.textContent = state.filePreviewError;
      return;
    }

    if (!state.selectedFile) {
      els.filePreview.textContent = "No workspace file content available.";
      return;
    }

    const card = createElement("article", "inspector-card");
    const meta = createElement(
      "p",
      "inspector-meta",
      `${state.selectedFile.path} · ${state.selectedFile.size} bytes`,
    );
    const body = createElement("pre", "code-block", state.selectedFile.content);

    card.appendChild(meta);
    card.appendChild(body);
    els.filePreview.replaceChildren(card);
  }

  function createDiffSide(title, payload) {
    const side = createElement("article", "diff-side");
    const heading = createElement("div", "diff-side-heading");
    const titleNode = createElement("h3", "diff-side-title", title);
    const refNode = createElement("p", "diff-side-ref", payload.ref || "");
    const body = createElement("pre", "code-block", payload.exists ? payload.content : "");

    heading.appendChild(titleNode);
    heading.appendChild(refNode);
    side.appendChild(heading);

    if (!payload.exists) {
      side.appendChild(createElement("p", "diff-empty", "File does not exist on this side."));
      return side;
    }

    side.appendChild(body);
    return side;
  }

  function renderDiffView() {
    els.diffView.classList.toggle("empty", !state.selectedPath || state.loadingSelection);

    if (!state.selectedPath) {
      els.diffView.textContent = "Select a file to render its Git-backed diff.";
      return;
    }

    if (state.loadingSelection) {
      els.diffView.textContent = `Loading Git diff for ${state.selectedPath}...`;
      return;
    }

    if (state.diffError) {
      els.diffView.textContent = state.diffError;
      return;
    }

    if (!state.selectedDiff) {
      els.diffView.textContent = "No Git diff available.";
      return;
    }

    const wrapper = createElement("article", "diff-card");
    const meta = createElement(
      "p",
      "inspector-meta",
      `${state.selectedDiff.path} · status ${describeGitStatus(state.selectedDiff.gitStatus)}`,
    );
    const columns = createElement("div", "diff-columns");

    columns.appendChild(createDiffSide("HEAD", state.selectedDiff.left));
    columns.appendChild(createDiffSide("WORKTREE", state.selectedDiff.right));
    wrapper.appendChild(meta);
    wrapper.appendChild(columns);
    els.diffView.replaceChildren(wrapper);
  }

  async function loadWorkspaceTree() {
    state.loadingWorkspaceTree = true;
    renderWorkspaceTree();

    try {
      const response = await api("/api/fs/tree", null, "GET");
      state.workspaceTree = Array.isArray(response.tree) ? response.tree : [];
      renderWorkspaceTree();

      const currentEntry = state.selectedPath
        ? findEntryByPath(state.workspaceTree, state.selectedPath)
        : null;
      if (currentEntry) {
        await selectPath(currentEntry.path);
        return;
      }

      const firstFile = findFirstFileNode(state.workspaceTree);
      if (firstFile) {
        await selectPath(firstFile.path);
      } else {
        state.selectedPath = null;
        state.selectedEntry = null;
        state.selectedFile = null;
        state.selectedDiff = null;
        state.filePreviewError = "";
        state.diffError = "";
        renderFilePreview();
        renderDiffView();
      }
    } catch (err) {
      state.workspaceTree = [];
      els.workspaceTree.classList.add("empty");
      els.workspaceTree.textContent = `Failed to load workspace tree: ${err.message}`;
      setStatus(`Workspace error: ${err.message}`);
    } finally {
      state.loadingWorkspaceTree = false;
      renderWorkspaceTree();
    }
  }

  async function selectPath(pathname) {
    const path = String(pathname || "");
    if (!path) {
      return;
    }

    state.selectedPath = path;
    state.selectedEntry = findEntryByPath(state.workspaceTree, path);
    state.selectedFile = null;
    state.selectedDiff = null;
    state.filePreviewError = "";
    state.diffError = "";
    state.loadingSelection = true;
    const token = ++state.selectionRequestToken;

    renderWorkspaceTree();
    renderFilePreview();
    renderDiffView();

    const encodedPath = encodeURIComponent(path);
    const [fileResult, diffResult] = await Promise.allSettled([
      api(`/api/fs/file?path=${encodedPath}`, null, "GET"),
      api(`/api/git/diff?path=${encodedPath}`, null, "GET"),
    ]);

    if (token !== state.selectionRequestToken) {
      return;
    }

    state.loadingSelection = false;

    if (fileResult.status === "fulfilled") {
      state.selectedFile = fileResult.value.file || null;
    } else {
      state.filePreviewError = `Failed to load file: ${fileResult.reason.message}`;
    }

    if (diffResult.status === "fulfilled") {
      state.selectedDiff = diffResult.value.diff || null;
    } else {
      state.diffError = `Failed to load diff: ${diffResult.reason.message}`;
    }

    renderWorkspaceTree();
    renderFilePreview();
    renderDiffView();

    if (state.filePreviewError || state.diffError) {
      setStatus(`Inspect error: ${state.filePreviewError || state.diffError}`);
      return;
    }
    setStatus(`Loaded ${path}`);
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
    setSessionId(null);
    state.pendingApprovals.clear();
    state.pendingUserInputs.clear();
    renderApprovals();
    renderUserInputs();
    updateComposerState();
  }

  function connectSse() {
    if (state.eventSource && typeof state.eventSource.close === "function") {
      state.eventSource.close();
    }

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
      setStatus("SSE disconnected. Reconnecting if the session is still alive.");
    };
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
      setStatus("Reconnected. Waiting for a thread to start.");
      return true;
    }

    try {
      await resyncThreadTranscript();
      setStatus(`Reconnected. Thread: ${state.threadId}`);
    } catch (err) {
      setStatus(`Reconnected, but transcript sync failed: ${err.message}`);
    }

    return true;
  }

  async function startSession() {
    setStatus("Starting session...");
    const session = await api("/api/session/start", {});
    setSessionId(session.sessionId);

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

  async function bootstrapSession() {
    const storedSessionId = loadPersistedSessionId();
    if (storedSessionId) {
      try {
        await reconnectSession(storedSessionId);
        return;
      } catch (err) {
        clearPersistedSessionId();
        setStatus(`Reconnect failed: ${err.message}. Starting a new session...`);
      }
    }

    await startSession();
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

  function bindPaneTabs() {
    const tabs = [
      [els.tabChat, "chat"],
      [els.tabFiles, "files"],
      [els.tabDiff, "diff"],
    ];

    for (const [button, pane] of tabs) {
      if (!button) {
        continue;
      }
      button.addEventListener("click", () => {
        setActivePane(pane);
      });
    }
  }

  async function init() {
    setActivePane(state.activePane);
    updateComposerState();
    renderWorkspaceTree();
    renderFilePreview();
    renderDiffView();
    renderApprovals();
    renderUserInputs();
    bindComposer();
    bindPaneTabs();

    await loadWorkspaceTree();

    if (autoStart) {
      await bootstrapSession();
    }
  }

  return {
    state,
    els,
    init,
    api,
    loadWorkspaceTree,
    selectPath,
    applySessionSnapshot,
    handleUserInputPending,
    handleUserInputResolved,
    handleUserInputTimedOut,
    renderUserInputs,
    splitAnswerText,
    rebuildTranscriptFromThread,
    reconnectSession,
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
