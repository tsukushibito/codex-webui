import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { apiRequest, parseEventData, SESSION_STORAGE_KEY } from '../lib/api';
import { findEntryByPath, findFirstFileNode } from '../lib/workspace';
import type {
  ApprovalDecision,
  ApprovalEvent,
  ApprovalRequest,
  ChatDeltaEvent,
  GitDiffRecord,
  GitDiffResponse,
  PaneId,
  RpcNotificationEvent,
  SessionClosedEvent,
  SessionReconnectResponse,
  SessionSnapshotPayload,
  SessionStartResponse,
  ThreadItem,
  ThreadReadResponse,
  ThreadRecord,
  ThreadStartResponse,
  TranscriptMessage,
  UserInputEvent,
  UserInputRequest,
  WorkspaceEntry,
  WorkspaceFile,
  WorkspaceFileResponse,
  WorkspaceTreeResponse,
} from '../types';
import type { MessageRole } from '../types';

function loadStoredSessionId(): string | null {
  try {
    return String(window.localStorage.getItem(SESSION_STORAGE_KEY) || '').trim() || null;
  } catch {
    return null;
  }
}

function persistSessionId(sessionId: string | null) {
  try {
    if (sessionId) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      return;
    }
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Best effort only.
  }
}

function extractUserMessageText(item: ThreadItem): string {
  const parts: string[] = [];
  if (item && item.type === 'userMessage') {
    const contentItems = Array.isArray(item.content) ? item.content : [];
    for (const contentItem of contentItems) {
      if (contentItem?.type === 'text' && typeof contentItem.text === 'string') {
        parts.push(contentItem.text);
      }
    }
  }
  return parts.join('\n').trim();
}

function transcriptFromThread(thread: ThreadRecord | null | undefined): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];
  const turns = Array.isArray(thread?.turns) ? thread.turns : [];
  for (const turn of turns) {
    const items = Array.isArray(turn?.items) ? turn.items : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      if (item.type === 'userMessage') {
        const text = extractUserMessageText(item);
        if (text) {
          messages.push({ id: item.id, role: 'user', text });
        }
      }
      if (item.type === 'agentMessage' && typeof item.text === 'string') {
        messages.push({ id: item.id, role: 'assistant', text: item.text });
      }
    }
  }
  return messages;
}

function appendMessage(previous: TranscriptMessage[], role: MessageRole, text: string, id?: string): TranscriptMessage[] {
  return [...previous, { id, role, text }];
}

function upsertMessageText(previous: TranscriptMessage[], id: string, nextText: string): TranscriptMessage[] {
  const index = previous.findIndex((message) => message.id === id);
  if (index === -1) {
    return appendMessage(previous, 'assistant', nextText, id);
  }

  return previous.map((message, messageIndex) => {
    if (messageIndex !== index) {
      return message;
    }
    return { ...message, text: nextText };
  });
}

export function useShellSession() {
  const [activePane, setActivePane] = useState<PaneId>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [statusText, setStatusText] = useState('Booting session...');
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Map<string, ApprovalRequest>>(() => new Map());
  const [pendingUserInputs, setPendingUserInputs] = useState<Map<string, UserInputRequest>>(() => new Map());
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WorkspaceEntry | null>(null);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<GitDiffRecord | null>(null);
  const [filePreviewError, setFilePreviewError] = useState('');
  const [diffError, setDiffError] = useState('');
  const [loadingWorkspaceTree, setLoadingWorkspaceTree] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const selectionRequestTokenRef = useRef(0);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  function updateSessionId(nextSessionId: string | null) {
    setSessionId(nextSessionId);
    persistSessionId(nextSessionId);
  }

  function syncPendingApprovals(approvals?: ApprovalRequest[]) {
    const next = new Map<string, ApprovalRequest>();
    for (const approval of approvals || []) {
      next.set(String(approval.requestId), approval);
    }
    setPendingApprovals(next);
  }

  function syncPendingUserInputs(requests?: UserInputRequest[]) {
    const next = new Map<string, UserInputRequest>();
    for (const request of requests || []) {
      next.set(String(request.requestId), request);
    }
    setPendingUserInputs(next);
  }

  async function selectPath(pathname: string) {
    const path = String(pathname || '');
    if (!path) {
      return;
    }

    setSelectedPath(path);
    setSelectedEntry(findEntryByPath(workspaceTree, path));
    setSelectedFile(null);
    setSelectedDiff(null);
    setFilePreviewError('');
    setDiffError('');
    setLoadingSelection(true);
    const token = ++selectionRequestTokenRef.current;
    const encodedPath = encodeURIComponent(path);

    const [fileResult, diffResult] = await Promise.allSettled([
      apiRequest<WorkspaceFileResponse>(`/api/fs/file?path=${encodedPath}`, undefined, 'GET'),
      apiRequest<GitDiffResponse>(`/api/git/diff?path=${encodedPath}`, undefined, 'GET'),
    ]);

    if (token !== selectionRequestTokenRef.current) {
      return;
    }

    setLoadingSelection(false);

    if (fileResult.status === 'fulfilled') {
      setSelectedFile(fileResult.value.file || null);
    } else {
      setFilePreviewError(`Failed to load file: ${fileResult.reason instanceof Error ? fileResult.reason.message : String(fileResult.reason)}`);
    }

    if (diffResult.status === 'fulfilled') {
      setSelectedDiff(diffResult.value.diff || null);
    } else {
      setDiffError(`Failed to load diff: ${diffResult.reason instanceof Error ? diffResult.reason.message : String(diffResult.reason)}`);
    }

    if (fileResult.status === 'rejected' || diffResult.status === 'rejected') {
      let rejectionReason: unknown;
      if (fileResult.status === 'rejected') {
        rejectionReason = fileResult.reason;
      } else if (diffResult.status === 'rejected') {
        rejectionReason = diffResult.reason;
      } else {
        rejectionReason = 'unknown error';
      }
      const message = rejectionReason instanceof Error ? rejectionReason.message : String(rejectionReason);
      setStatusText(`Inspect error: ${message}`);
      return;
    }

    setStatusText(`Loaded ${path}`);
  }

  async function loadWorkspaceTree() {
    setLoadingWorkspaceTree(true);

    try {
      const response = await apiRequest<WorkspaceTreeResponse>('/api/fs/tree', undefined, 'GET');
      const tree = Array.isArray(response.tree) ? response.tree : [];
      setWorkspaceTree(tree);

      const currentEntry = selectedPath ? findEntryByPath(tree, selectedPath) : null;
      if (currentEntry) {
        await selectPath(currentEntry.path);
        return;
      }

      const firstFile = findFirstFileNode(tree);
      if (firstFile) {
        await selectPath(firstFile.path);
        return;
      }

      setSelectedPath(null);
      setSelectedEntry(null);
      setSelectedFile(null);
      setSelectedDiff(null);
      setFilePreviewError('');
      setDiffError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkspaceTree([]);
      setStatusText(`Workspace error: ${message}`);
    } finally {
      setLoadingWorkspaceTree(false);
    }
  }

  async function resyncTranscript(currentSessionId: string, currentThreadId: string) {
    const response = await apiRequest<ThreadReadResponse>('/api/thread/read', {
      sessionId: currentSessionId,
      threadId: currentThreadId,
      includeTurns: true,
    });
    setMessages(transcriptFromThread(response.result?.thread));
  }

  function applySnapshot(payload: SessionSnapshotPayload | null) {
    if (!payload) {
      return;
    }
    if (typeof payload.threadId === 'string') {
      setThreadId(payload.threadId);
    }
    if (payload.threadId === null) {
      setThreadId(null);
    }
    syncPendingApprovals(payload.pendingApprovals);
    syncPendingUserInputs(payload.pendingUserInputs);
  }

  function connectSse(currentSessionId: string) {
    eventSourceRef.current?.close();
    const source = new EventSource(`/api/session/events?sessionId=${encodeURIComponent(currentSessionId)}`);

    source.addEventListener('session/snapshot', (event) => {
      applySnapshot(parseEventData<SessionSnapshotPayload>(event as MessageEvent<string>));
    });

    source.addEventListener('rpc/notification', (event) => {
      const payload = parseEventData<RpcNotificationEvent>(event as MessageEvent<string>);
      const message = payload?.message;
      if (!message) {
        return;
      }

      if (message.method === 'thread/started') {
        const nextThreadId = (message.params as { thread?: { id?: string } } | undefined)?.thread?.id || null;
        setThreadId(nextThreadId);
        if (nextThreadId) {
          setStatusText(`Thread ready: ${nextThreadId}`);
        }
        return;
      }

      const itemParams = message.params as { item?: { id?: string; type?: string; text?: string } } | undefined;

      if (message.method === 'item/started' && itemParams?.item?.type === 'agentMessage') {
        const itemId = itemParams.item.id;
        if (!itemId) {
          return;
        }
        setMessages((previous) => {
          if (previous.some((entry) => entry.id === itemId)) {
            return previous;
          }
          return appendMessage(previous, 'assistant', '', itemId);
        });
        return;
      }

      if (message.method === 'item/completed' && itemParams?.item?.type === 'agentMessage') {
        const itemId = itemParams.item.id;
        if (!itemId) {
          return;
        }
        setMessages((previous) => upsertMessageText(previous, itemId, itemParams.item?.text || ''));
        return;
      }

      if (message.method === 'turn/completed') {
        setSending(false);
        setStatusText('Turn completed.');
      }
    });

    source.addEventListener('chat/delta', (event) => {
      const payload = parseEventData<ChatDeltaEvent>(event as MessageEvent<string>);
      const itemId = payload?.params?.itemId;
      const delta = payload?.params?.delta || '';
      if (!itemId || typeof delta !== 'string') {
        return;
      }
      setMessages((previous) => {
        const existing = previous.find((entry) => entry.id === itemId);
        return upsertMessageText(previous, itemId, `${existing?.text || ''}${delta}`);
      });
    });

    source.addEventListener('approval/pending', (event) => {
      const payload = parseEventData<ApprovalEvent>(event as MessageEvent<string>);
      const approval = payload?.approval;
      if (!approval) {
        return;
      }
      setPendingApprovals((previous) => new Map(previous).set(String(approval.requestId), approval));
      setStatusText(`Approval requested: ${approval.method}`);
    });

    source.addEventListener('approval/resolved', (event) => {
      const payload = parseEventData<ApprovalEvent>(event as MessageEvent<string>);
      const requestId = String(payload?.approval?.requestId || '');
      if (!requestId) {
        return;
      }
      setPendingApprovals((previous) => {
        const next = new Map(previous);
        next.delete(requestId);
        return next;
      });
    });

    source.addEventListener('approval/timed_out', (event) => {
      const payload = parseEventData<ApprovalEvent>(event as MessageEvent<string>);
      const requestId = String(payload?.approval?.requestId || '');
      if (requestId) {
        setPendingApprovals((previous) => {
          const next = new Map(previous);
          next.delete(requestId);
          return next;
        });
      }
      setStatusText('An approval request timed out.');
    });

    source.addEventListener('user_input/pending', (event) => {
      const payload = parseEventData<UserInputEvent>(event as MessageEvent<string>);
      const request = payload?.request;
      if (!request) {
        return;
      }
      setPendingUserInputs((previous) => new Map(previous).set(String(request.requestId), request));
      setStatusText(`User input requested: ${request.method}`);
    });

    source.addEventListener('user_input/resolved', (event) => {
      const payload = parseEventData<UserInputEvent>(event as MessageEvent<string>);
      const requestId = String(payload?.request?.requestId || '');
      if (!requestId) {
        return;
      }
      setPendingUserInputs((previous) => {
        const next = new Map(previous);
        next.delete(requestId);
        return next;
      });
    });

    source.addEventListener('user_input/timed_out', (event) => {
      const payload = parseEventData<UserInputEvent>(event as MessageEvent<string>);
      const requestId = String(payload?.request?.requestId || '');
      if (requestId) {
        setPendingUserInputs((previous) => {
          const next = new Map(previous);
          next.delete(requestId);
          return next;
        });
      }
      setStatusText('A user input request timed out.');
    });

    source.addEventListener('session/closed', (event) => {
      const payload = parseEventData<SessionClosedEvent>(event as MessageEvent<string>);
      setStatusText(`Session closed: ${payload?.reason || 'unknown'}`);
      setSending(false);
      setThreadId(null);
      updateSessionId(null);
      setPendingApprovals(new Map());
      setPendingUserInputs(new Map());
    });

    source.onerror = () => {
      setStatusText('SSE disconnected. Reconnecting if the session is still alive.');
    };

    eventSourceRef.current = source;
  }

  async function reconnectSession(existingSessionId: string): Promise<boolean> {
    const reconnect = await apiRequest<SessionReconnectResponse>('/api/session/reconnect', {
      sessionId: existingSessionId,
    });

    updateSessionId(reconnect.sessionId);
    applySnapshot(reconnect);
    connectSse(reconnect.sessionId);

    if (!reconnect.threadId) {
      setStatusText('Reconnected. Waiting for a thread to start.');
      return true;
    }

    try {
      await resyncTranscript(reconnect.sessionId, reconnect.threadId);
      setStatusText(`Reconnected. Thread: ${reconnect.threadId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(`Reconnected, but transcript sync failed: ${message}`);
    }
    return true;
  }

  async function startSession() {
    setStatusText('Starting session...');
    const session = await apiRequest<SessionStartResponse>('/api/session/start', {});
    updateSessionId(session.sessionId);
    connectSse(session.sessionId);

    setStatusText('Creating thread...');
    const thread = await apiRequest<ThreadStartResponse>('/api/thread/start', {
      sessionId: session.sessionId,
      params: {},
    });

    const nextThreadId = thread.result?.thread?.id || null;
    setThreadId(nextThreadId);

    if (nextThreadId) {
      setStatusText(`Ready. Thread: ${nextThreadId}`);
      setMessages((previous) => appendMessage(previous, 'system', 'Session ready. Start chatting.'));
      return;
    }

    setStatusText('Ready, but thread ID is missing.');
  }

  async function bootstrapSession() {
    const storedSessionId = loadStoredSessionId();
    if (storedSessionId) {
      try {
        await reconnectSession(storedSessionId);
        return;
      } catch (error) {
        persistSessionId(null);
        const message = error instanceof Error ? error.message : String(error);
        setStatusText(`Reconnect failed: ${message}. Starting a new session...`);
      }
    }

    await startSession();
  }

  async function sendTurn(text: string) {
    const currentSessionId = sessionIdRef.current;
    const currentThreadId = threadIdRef.current;
    if (!text || !currentSessionId || !currentThreadId || sending) {
      return;
    }

    setSending(true);
    setMessages((previous) => appendMessage(previous, 'user', text));

    try {
      await apiRequest('/api/turn/start', {
        sessionId: currentSessionId,
        threadId: currentThreadId,
        prompt: text,
      });
      setStatusText('Turn started...');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSending(false);
      setStatusText(`Turn error: ${message}`);
    }
  }

  async function resolveApproval(approval: ApprovalRequest, decision: ApprovalDecision) {
    try {
      await apiRequest('/api/approvals/respond', {
        sessionId: sessionIdRef.current,
        requestId: approval.requestId,
        decision,
      });
      setStatusText(`Approval resolved: ${approval.requestId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(`Approval error: ${message}`);
    }
  }

  async function submitUserInput(request: UserInputRequest, answers: Record<string, string[]>) {
    try {
      await apiRequest('/api/user-input/respond', {
        sessionId: sessionIdRef.current,
        requestId: request.requestId,
        answers,
      });
      setStatusText(`User input resolved: ${request.requestId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(`User input error: ${message}`);
    }
  }

  async function skipUserInput(request: UserInputRequest) {
    try {
      await apiRequest('/api/user-input/respond', {
        sessionId: sessionIdRef.current,
        requestId: request.requestId,
        answers: {},
      });
      setStatusText(`User input skipped: ${request.requestId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(`User input error: ${message}`);
    }
  }

  useEffect(() => {
    loadWorkspaceTree().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(`Workspace error: ${message}`);
    });

    bootstrapSession().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatusText(`Startup failed: ${message}`);
      setMessages((previous) => appendMessage(previous, 'system', `Startup failed: ${message}`));
    });

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return useMemo(() => ({
    activePane,
    approvals: Array.from(pendingApprovals.values()),
    diffError,
    filePreviewError,
    loadingSelection,
    loadingWorkspaceTree,
    messages,
    onResolveApproval: resolveApproval,
    onSelectPath: selectPath,
    onSkipUserInput: skipUserInput,
    onSubmitUserInput: submitUserInput,
    selectedDiff,
    selectedEntry,
    selectedFile,
    selectedPath,
    sending,
    sessionId,
    setActivePane,
    sendTurn,
    sessionReady: Boolean(threadId),
    statusText,
    userInputs: Array.from(pendingUserInputs.values()),
    workspaceTree,
  }), [
    activePane,
    diffError,
    filePreviewError,
    loadingSelection,
    loadingWorkspaceTree,
    messages,
    pendingApprovals,
    pendingUserInputs,
    selectedDiff,
    selectedEntry,
    selectedFile,
    selectedPath,
    sending,
    sessionId,
    statusText,
    threadId,
    workspaceTree,
  ]);
}
