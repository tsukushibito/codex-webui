const transport = typeof require === "function"
  ? require("./app-transport.js")
  : globalThis.CodexWebUi;
const renderModule = typeof require === "function"
  ? require("./app-render.js")
  : globalThis.CodexWebUi;
const sessionModule = typeof require === "function"
  ? require("./app-session.js")
  : globalThis.CodexWebUi;

const { createApiClient } = transport;
const { createRenderer, findEntryByPath, findFirstFileNode, splitAnswerText } = renderModule;
const { createSessionController } = sessionModule;

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

  const { api } = createApiClient(fetchImpl);

  async function handleApprovalDecision(approval, decision) {
    try {
      await api("/api/approvals/respond", {
        sessionId: state.sessionId,
        requestId: approval.requestId,
        decision,
      });
      renderer.setStatus(`Approval resolved: ${approval.requestId}`);
    } catch (err) {
      renderer.setStatus(`Approval error: ${err.message}`);
    }
  }

  async function handleUserInputSubmit(request, answers) {
    try {
      await api("/api/user-input/respond", {
        sessionId: state.sessionId,
        requestId: request.requestId,
        answers,
      });
      renderer.setStatus(`User input resolved: ${request.requestId}`);
    } catch (err) {
      renderer.setStatus(`User input error: ${err.message}`);
    }
  }

  async function handleUserInputSkip(request) {
    try {
      await api("/api/user-input/respond", {
        sessionId: state.sessionId,
        requestId: request.requestId,
        answers: {},
      });
      renderer.setStatus(`User input skipped: ${request.requestId}`);
    } catch (err) {
      renderer.setStatus(`User input error: ${err.message}`);
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

    renderer.renderWorkspaceTree();
    renderer.renderFilePreview();
    renderer.renderDiffView();

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

    renderer.renderWorkspaceTree();
    renderer.renderFilePreview();
    renderer.renderDiffView();

    if (state.filePreviewError || state.diffError) {
      renderer.setStatus(`Inspect error: ${state.filePreviewError || state.diffError}`);
      return;
    }
    renderer.setStatus(`Loaded ${path}`);
  }

  const renderer = createRenderer({
    doc,
    state,
    els,
    onResolveApproval: handleApprovalDecision,
    onSelectPath: selectPath,
    onSkipUserInput: handleUserInputSkip,
    onSubmitUserInput: handleUserInputSubmit,
  });

  const sessionController = createSessionController({
    EventSourceImpl,
    api,
    render: renderer,
    state,
    storage,
  });

  async function loadWorkspaceTree() {
    state.loadingWorkspaceTree = true;
    renderer.renderWorkspaceTree();

    try {
      const response = await api("/api/fs/tree", null, "GET");
      state.workspaceTree = Array.isArray(response.tree) ? response.tree : [];
      renderer.renderWorkspaceTree();

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
        renderer.renderFilePreview();
        renderer.renderDiffView();
      }
    } catch (err) {
      state.workspaceTree = [];
      els.workspaceTree.classList.add("empty");
      els.workspaceTree.textContent = `Failed to load workspace tree: ${err.message}`;
      renderer.setStatus(`Workspace error: ${err.message}`);
    } finally {
      state.loadingWorkspaceTree = false;
      renderer.renderWorkspaceTree();
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
      await sessionController.sendTurn(text);
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
        renderer.setActivePane(pane);
      });
    }
  }

  async function init() {
    renderer.setActivePane(state.activePane);
    renderer.updateComposerState();
    renderer.renderAll();
    bindComposer();
    bindPaneTabs();

    await loadWorkspaceTree();

    if (autoStart) {
      await sessionController.bootstrapSession();
    }
  }

  return {
    state,
    els,
    init,
    api,
    loadWorkspaceTree,
    selectPath,
    applySessionSnapshot: sessionController.applySessionSnapshot,
    handleUserInputPending: sessionController.handleUserInputPending,
    handleUserInputResolved: sessionController.handleUserInputResolved,
    handleUserInputTimedOut: sessionController.handleUserInputTimedOut,
    renderUserInputs: renderer.renderUserInputs,
    splitAnswerText,
    rebuildTranscriptFromThread: sessionController.rebuildTranscriptFromThread,
    reconnectSession: sessionController.reconnectSession,
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
