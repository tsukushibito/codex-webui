import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { SESSION_STORAGE_KEY } from './lib/api';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  readonly url: string;
  closed = false;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: MessageEvent<string>) => void) {
    const list = this.listeners.get(type) || [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, payload: unknown) {
    for (const handler of this.listeners.get(type) || []) {
      handler({ data: JSON.stringify(payload) } as MessageEvent<string>);
    }
  }
}

function createStorage() {
  const store = new Map<string, string>();
  return {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) || null : null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('Preact App', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
    vi.stubGlobal('localStorage', storage as unknown as Storage);
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    FakeEventSource.instances = [];
  });

  it('reconnects a stored session and renders transcript and pending interactions', async () => {
    storage.setItem(SESSION_STORAGE_KEY, 'session-restore');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestPath = String(input);

      if (requestPath === '/api/fs/tree') {
        return jsonResponse({ ok: true, tree: [] });
      }
      if (requestPath === '/api/session/reconnect') {
        return jsonResponse({
          ok: true,
          sessionId: 'session-restore',
          threadId: 'thread-restore',
          pendingApprovals: [
            {
              requestId: 'approval-1',
              method: 'item/commandExecution/requestApproval',
              params: { command: ['pwd'] },
            },
          ],
          pendingUserInputs: [
            {
              requestId: 'request-1',
              method: 'item/tool/requestUserInput',
              params: {
                questions: [
                  {
                    id: 'color',
                    header: 'Color',
                    question: 'Pick a color',
                    options: [{ label: 'Blue', description: 'Recommended' }],
                  },
                ],
              },
            },
          ],
        });
      }
      if (requestPath === '/api/thread/read') {
        return jsonResponse({
          ok: true,
          result: {
            thread: {
              id: 'thread-restore',
              turns: [
                {
                  id: 'turn-1',
                  items: [
                    { id: 'user-1', type: 'userMessage', content: [{ type: 'text', text: 'Reconnect me' }] },
                    { id: 'assistant-1', type: 'agentMessage', text: 'Transcript restored' },
                  ],
                },
              ],
            },
          },
        });
      }
      throw new Error(`Unexpected request: ${requestPath}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Reconnect me')).toBeTruthy();
    expect(screen.getByText('Transcript restored')).toBeTruthy();
    expect(screen.getByText('item/commandExecution/requestApproval')).toBeTruthy();
    expect(screen.getByText('Pick a color')).toBeTruthy();
    expect(screen.getByText('session-restore')).toBeTruthy();
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe('/api/session/events?sessionId=session-restore');
  });

  it('loads the workspace tree and updates file inspection when a file is selected', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestPath = String(input);

      if (requestPath === '/api/fs/tree') {
        return jsonResponse({
          ok: true,
          tree: [
            {
              type: 'file',
              name: 'README.md',
              path: 'README.md',
              gitStatus: ' M',
            },
            {
              type: 'directory',
              name: 'docs',
              path: 'docs',
              children: [
                {
                  type: 'file',
                  name: 'notes.md',
                  path: 'docs/notes.md',
                  gitStatus: '??',
                },
              ],
            },
          ],
        });
      }
      if (requestPath === '/api/fs/file?path=README.md') {
        return jsonResponse({ ok: true, file: { path: 'README.md', content: '# README\n', size: 9 } });
      }
      if (requestPath === '/api/git/diff?path=README.md') {
        return jsonResponse({
          ok: true,
          diff: {
            path: 'README.md',
            gitStatus: ' M',
            left: { exists: true, ref: 'HEAD', content: '# Old\n' },
            right: { exists: true, ref: 'WORKTREE', content: '# README\n' },
          },
        });
      }
      if (requestPath === '/api/fs/file?path=docs%2Fnotes.md') {
        return jsonResponse({ ok: true, file: { path: 'docs/notes.md', content: 'notes\n', size: 6 } });
      }
      if (requestPath === '/api/git/diff?path=docs%2Fnotes.md') {
        return jsonResponse({
          ok: true,
          diff: {
            path: 'docs/notes.md',
            gitStatus: '??',
            left: { exists: false, ref: 'HEAD', content: '' },
            right: { exists: true, ref: 'WORKTREE', content: 'notes\n' },
          },
        });
      }
      if (requestPath === '/api/session/start') {
        return jsonResponse({
          ok: true,
          sessionId: 'session-1',
          idleTimeoutMs: 1000,
          approvalTimeoutMs: 1000,
          userInputTimeoutMs: 1000,
        });
      }
      if (requestPath === '/api/thread/start') {
        return jsonResponse({ ok: true, result: { thread: { id: 'thread-1' } } });
      }
      throw new Error(`Unexpected request: ${requestPath}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const readmeBlocks = await screen.findAllByText('# README');
    expect(readmeBlocks.length).toBeGreaterThan(0);
    expect(screen.getByText('# Old')).toBeTruthy();
    expect(screen.getAllByText('README.md').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'notes.md??' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Expand docs directory' }));

    await fireEvent.click(screen.getByRole('button', { name: 'notes.md??' }));

    await waitFor(() => {
      expect(screen.getAllByText('notes').length).toBeGreaterThan(0);
      expect(screen.getAllByText('docs/notes.md').length).toBeGreaterThan(0);
    });
  });

  it('submits approval and user-input responses from the migrated UI', async () => {
    storage.setItem(SESSION_STORAGE_KEY, 'session-restore');
    const calls: Array<{ requestPath: string; body: unknown }> = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestPath = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ requestPath, body });

      if (requestPath === '/api/fs/tree') {
        return jsonResponse({ ok: true, tree: [] });
      }
      if (requestPath === '/api/session/reconnect') {
        return jsonResponse({
          ok: true,
          sessionId: 'session-restore',
          threadId: 'thread-restore',
          pendingApprovals: [
            { requestId: 'approval-1', method: 'item/commandExecution/requestApproval', params: { command: ['pwd'] } },
          ],
          pendingUserInputs: [
            {
              requestId: 'request-1',
              method: 'item/tool/requestUserInput',
              params: {
                questions: [
                  {
                    id: 'color',
                    header: 'Color',
                    question: 'Pick a color',
                    options: [
                      { label: 'Blue', description: 'Recommended' },
                      { label: 'Red', description: 'Alt' },
                    ],
                  },
                ],
              },
            },
          ],
        });
      }
      if (requestPath === '/api/thread/read') {
        return jsonResponse({ ok: true, result: { thread: { id: 'thread-restore', turns: [] } } });
      }
      if (requestPath === '/api/approvals/respond') {
        return jsonResponse({ ok: true });
      }
      if (requestPath === '/api/user-input/respond') {
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unexpected request: ${requestPath}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await screen.findByText('item/commandExecution/requestApproval');
    await screen.findByText('session-restore');
    await fireEvent.click(screen.getByRole('button', { name: 'Allow' }));

    const textarea = await screen.findByPlaceholderText('Enter one answer per line');
    await fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
    await fireEvent.input(textarea, { currentTarget: { value: 'Blue\nGreen' }, target: { value: 'Blue\nGreen' } });
    await fireEvent.submit(textarea.closest('form') as HTMLFormElement);

    const approvalCall = calls.find((call) => call.requestPath === '/api/approvals/respond');
    const userInputCall = calls.find((call) => call.requestPath === '/api/user-input/respond');

    expect(approvalCall?.body).toEqual({
      sessionId: 'session-restore',
      requestId: 'approval-1',
      decision: 'allow',
    });
    expect(userInputCall?.body).toEqual({
      sessionId: 'session-restore',
      requestId: 'request-1',
      answers: {
        color: ['Blue', 'Green'],
      },
    });
  });
});
