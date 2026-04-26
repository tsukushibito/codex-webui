import type { PublicMessage, PublicSessionEvent, PublicSessionSummary } from "./legacy-types";

export interface ChatSessionSnapshot {
  session: PublicSessionSummary | null;
  messages: PublicMessage[];
  events: PublicSessionEvent[];
}

export interface SendRecoveryBaseline {
  knownAssistantMessageIds: Set<string>;
  lastEventSequence: number;
}

interface TimerApi {
  clearTimeout(timeoutId: number): void;
  setTimeout(callback: () => void, delayMs: number): number;
}

interface MissedStreamRecoveryOptions {
  delayMs?: number;
  maxAttempts?: number;
  timerApi?: TimerApi;
}

interface MissedStreamRecoveryTarget {
  getSnapshot: () => ChatSessionSnapshot;
  refreshSession: () => Promise<ChatSessionSnapshot | null>;
}

const terminalRecoveryEventTypes = new Set<PublicSessionEvent["event_type"]>([
  "approval.requested",
  "approval.resolved",
  "message.assistant.completed",
]);

const defaultTimerApi: TimerApi = {
  clearTimeout(timeoutId) {
    window.clearTimeout(timeoutId);
  },
  setTimeout(callback, delayMs) {
    return window.setTimeout(callback, delayMs);
  },
};

export function createSendRecoveryBaseline(snapshot: ChatSessionSnapshot): SendRecoveryBaseline {
  return {
    knownAssistantMessageIds: new Set(
      snapshot.messages
        .filter((message) => message.role === "assistant")
        .map((message) => message.message_id),
    ),
    lastEventSequence: snapshot.events.reduce(
      (highestSequence, event) => Math.max(highestSequence, event.sequence),
      0,
    ),
  };
}

export function hasSendRecoveryConverged(
  snapshot: ChatSessionSnapshot,
  baseline: SendRecoveryBaseline,
) {
  if (snapshot.session?.active_approval_id) {
    return true;
  }

  if (
    snapshot.events.some(
      (event) =>
        event.sequence > baseline.lastEventSequence &&
        terminalRecoveryEventTypes.has(event.event_type),
    )
  ) {
    return true;
  }

  return snapshot.messages.some(
    (message) =>
      message.role === "assistant" && !baseline.knownAssistantMessageIds.has(message.message_id),
  );
}

function shouldRetryRecovery(attempt: number, maxAttempts: number) {
  return attempt < maxAttempts;
}

export function createMissedStreamRecoveryController({
  delayMs = 1500,
  maxAttempts = 3,
  timerApi = defaultTimerApi,
}: MissedStreamRecoveryOptions = {}) {
  let activeRunId = 0;
  let pendingTimeoutId: number | null = null;

  function clearPendingTimeout() {
    if (pendingTimeoutId !== null) {
      timerApi.clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
    }
  }

  function cancel() {
    activeRunId += 1;
    clearPendingTimeout();
  }

  function scheduleAttempt(
    runId: number,
    attempt: number,
    target: MissedStreamRecoveryTarget,
    baseline: SendRecoveryBaseline,
  ) {
    clearPendingTimeout();
    pendingTimeoutId = timerApi.setTimeout(() => {
      void (async () => {
        if (runId !== activeRunId) {
          return;
        }

        if (hasSendRecoveryConverged(target.getSnapshot(), baseline)) {
          clearPendingTimeout();
          return;
        }

        let refreshedSnapshot: ChatSessionSnapshot | null = null;

        try {
          refreshedSnapshot = await target.refreshSession();
        } catch {
          refreshedSnapshot = null;
        }

        if (runId !== activeRunId) {
          return;
        }

        if (refreshedSnapshot && hasSendRecoveryConverged(refreshedSnapshot, baseline)) {
          clearPendingTimeout();
          return;
        }

        if (shouldRetryRecovery(attempt, maxAttempts)) {
          scheduleAttempt(runId, attempt + 1, target, baseline);
          return;
        }

        clearPendingTimeout();
      })();
    }, delayMs);
  }

  return {
    cancel,
    start(target: MissedStreamRecoveryTarget, baseline: SendRecoveryBaseline) {
      cancel();
      const runId = activeRunId;
      scheduleAttempt(runId, 1, target, baseline);
    },
  };
}
