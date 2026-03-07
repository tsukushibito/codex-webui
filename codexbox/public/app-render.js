(function initCodexWebUiRender(factory) {
  const exported = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.CodexWebUi = globalThis.CodexWebUi || {};
    Object.assign(globalThis.CodexWebUi, exported);
  }
})(function buildCodexWebUiRender() {
  function splitAnswerText(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
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

  function createRenderer(options) {
    const {
      doc,
      state,
      els,
      onResolveApproval,
      onSelectPath,
      onSkipUserInput,
      onSubmitUserInput,
    } = options;

    function setStatus(text) {
      els.status.textContent = text;
    }

    function setSessionId(sessionId) {
      els.sessionId.textContent = sessionId || "-";
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

    function appendMessage(kind, text, messageOptions = {}) {
      const node = createElement("article", `msg ${kind}`, text);

      if (messageOptions.itemId) {
        node.dataset.itemId = messageOptions.itemId;
        state.messageById.set(messageOptions.itemId, node);
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
          await onSelectPath(node.path);
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
            await onResolveApproval(approval, decision);
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
          await onSkipUserInput(request);
        });

        actions.appendChild(submit);
        actions.appendChild(skip);
        form.appendChild(actions);

        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          await onSubmitUserInput(request, collectUserInputAnswers(textareas));
        });

        card.appendChild(method);
        card.appendChild(form);
        els.userInputs.appendChild(card);
      }
    }

    function renderAll() {
      renderWorkspaceTree();
      renderFilePreview();
      renderDiffView();
      renderApprovals();
      renderUserInputs();
    }

    return {
      appendMessage,
      clearMessages,
      renderAll,
      renderApprovals,
      renderDiffView,
      renderFilePreview,
      renderUserInputs,
      renderWorkspaceTree,
      setActivePane,
      setSessionId,
      setStatus,
      updateComposerState,
    };
  }

  return {
    createRenderer,
    describeGitStatus,
    findEntryByPath,
    findFirstFileNode,
    splitAnswerText,
  };
});
