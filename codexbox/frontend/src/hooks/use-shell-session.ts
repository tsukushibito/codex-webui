import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { apiRequest, parseEventData, SESSION_STORAGE_KEY } from '../lib/api';
import type {
  ChatDeltaEvent,
  RpcNotificationEvent,
  SessionClosedEvent,
  SessionReconnectResponse,
  SessionSnapshotPayload,
  SessionStartResponse,
  ThreadItem,
  ThreadReadResponse,
  ThreadRecord,
  ThreadStartResponse,
} from '../types';
import type { MessageRole, PaneId, TranscriptMessage } from '../types';

type ApprovalEventPayload = { approval?: { requestId?: string; method?: string } };
type UserInputEventPayload = { request?: { requestId?: string; method?: string } };

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

function appendMessage(
  previous: TranscriptMessage[],
  role: MessageRole,
  text: string,
  id?: string,
): TranscriptMessage[] {
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

  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const threadIdRef = useRef<string | null>(null);

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
      const payload = parseEventData<ApprovalEventPayload>(event as MessageEvent<string>);
      if (payload?.approval?.method) {
        setStatusText(`Approval requested: ${payload.approval.method}`);
      }
    });

    source.addEventListener('user_input/pending', (event) => {
      const payload = parseEventData<UserInputEventPayload>(event as MessageEvent<string>);
      if (payload?.request?.method) {
        setStatusText(`User input requested: ${payload.request.method}`);
      }
    });

    source.addEventListener('session/closed', (event) => {
      const payload = parseEventData<SessionClosedEvent>(event as MessageEvent<string>);
      setStatusText(`Session closed: ${payload?.reason || 'unknown'}`);
      setSending(false);
      setThreadId(null);
      updateSessionId(null);
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
    setThreadId(reconnect.threadId || null);
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

  useEffect(() => {
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
    messages,
    sending,
    sessionId,
    setActivePane,
    sendTurn,
    sessionReady: Boolean(threadId),
    statusText,
  }), [activePane, messages, sending, sessionId, statusText, threadId]);
}
