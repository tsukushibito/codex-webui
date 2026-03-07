import type { ApiErrorResponse } from '../types';

export const SESSION_STORAGE_KEY = 'codex-webui.sessionId';

export async function apiRequest<T>(
  requestPath: string,
  payload?: unknown,
  method: 'GET' | 'POST' = 'POST',
): Promise<T> {
  const options: RequestInit = { method, headers: {} };
  if (method !== 'GET') {
    options.headers = { 'content-type': 'application/json' };
    options.body = JSON.stringify(payload ?? {});
  }

  const response = await fetch(requestPath, options);
  const body = (await response.json().catch(() => ({}))) as Partial<T & ApiErrorResponse>;
  if (!response.ok || body.ok === false) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body as T;
}

export function parseEventData<T>(event: MessageEvent<string>): T | null {
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}
