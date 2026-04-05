import { describe, expect, it, vi } from "vitest";

import {
  createMissedStreamRecoveryController,
  createSendRecoveryBaseline,
  hasSendRecoveryConverged,
  type ChatSessionSnapshot,
} from "../src/chat-send-recovery";

function buildSnapshot(
  overrides: Partial<ChatSessionSnapshot> = {},
): ChatSessionSnapshot {
  return {
    session: {
      session_id: "thread_001",
      workspace_id: "ws_alpha",
      title: "Fix build error",
      status: "running",
      created_at: "2026-03-27T05:12:34Z",
      updated_at: "2026-03-27T05:22:00Z",
      started_at: "2026-03-27T05:13:00Z",
      last_message_at: "2026-03-27T05:21:40Z",
      active_approval_id: null,
      can_send_message: true,
      can_start: false,
      can_stop: true,
    },
    messages: [
      {
        message_id: "msg_user_001",
        session_id: "thread_001",
        role: "user",
        content: "Please explain the changes.",
        created_at: "2026-03-27T05:15:00Z",
      },
    ],
    events: [
      {
        event_id: "evt_001",
        session_id: "thread_001",
        event_type: "session.status_changed",
        sequence: 1,
        occurred_at: "2026-03-27T05:13:00Z",
        payload: {
          from_status: "created",
          to_status: "running",
        },
      },
    ],
    ...overrides,
  };
}

function createManualTimerApi() {
  let nextTimeoutId = 1;
  const pendingCallbacks = new Map<number, () => void>();

  return {
    clearTimeout(timeoutId: number) {
      pendingCallbacks.delete(timeoutId);
    },
    pendingCount() {
      return pendingCallbacks.size;
    },
    runNext() {
      const nextPending = pendingCallbacks.entries().next().value as
        | [number, () => void]
        | undefined;

      if (!nextPending) {
        throw new Error("No pending timeouts.");
      }

      const [timeoutId, callback] = nextPending;
      pendingCallbacks.delete(timeoutId);
      callback();
    },
    setTimeout(callback: () => void) {
      const timeoutId = nextTimeoutId;
      nextTimeoutId += 1;
      pendingCallbacks.set(timeoutId, callback);
      return timeoutId;
    },
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("chat send recovery", () => {
  it("treats later assistant output as convergence after a missed stream update", () => {
    const baseline = createSendRecoveryBaseline(buildSnapshot());

    const hasConverged = hasSendRecoveryConverged(
      buildSnapshot({
        messages: [
          {
            message_id: "msg_user_001",
            session_id: "thread_001",
            role: "user",
            content: "Please explain the changes.",
            created_at: "2026-03-27T05:15:00Z",
          },
          {
            message_id: "msg_asst_001",
            session_id: "thread_001",
            role: "assistant",
            content: "Here is the explanation.",
            created_at: "2026-03-27T05:15:02Z",
          },
        ],
      }),
      baseline,
    );

    expect(hasConverged).toBe(true);
  });

  it("treats approval or later event visibility as convergence", () => {
    const baseline = createSendRecoveryBaseline(buildSnapshot());
    const baseSession = buildSnapshot().session!;

    expect(
      hasSendRecoveryConverged(
        buildSnapshot({
          session: {
            ...baseSession,
            active_approval_id: "apr_001",
            status: "waiting_approval",
          },
        }),
        baseline,
      ),
    ).toBe(true);

    expect(
      hasSendRecoveryConverged(
        buildSnapshot({
          events: [
            ...buildSnapshot().events,
            {
              event_id: "evt_002",
              session_id: "thread_001",
              event_type: "approval.requested",
              sequence: 2,
              occurred_at: "2026-03-27T05:15:02Z",
              payload: {
                approval_id: "apr_001",
                title: "Run git push",
              },
            },
          ],
        }),
        baseline,
      ),
    ).toBe(true);
  });

  it("does not treat generic later events as convergence", () => {
    const baseline = createSendRecoveryBaseline(buildSnapshot());

    expect(
      hasSendRecoveryConverged(
        buildSnapshot({
          events: [
            ...buildSnapshot().events,
            {
              event_id: "evt_002",
              session_id: "thread_001",
              event_type: "message.user",
              sequence: 2,
              occurred_at: "2026-03-27T05:15:02Z",
              payload: {
                content: "Please explain the changes.",
                message_id: "msg_user_001",
              },
            },
            {
              event_id: "evt_003",
              session_id: "thread_001",
              event_type: "session.status_changed",
              sequence: 3,
              occurred_at: "2026-03-27T05:15:03Z",
              payload: {
                from_status: "running",
                to_status: "waiting_input",
              },
            },
          ],
        }),
        baseline,
      ),
    ).toBe(false);
  });

  it("retries refreshes until the session bundle shows a visible artifact", async () => {
    const timerApi = createManualTimerApi();
    const controller = createMissedStreamRecoveryController({
      delayMs: 25,
      maxAttempts: 3,
      timerApi,
    });
    const currentSnapshot = { value: buildSnapshot() };
    const baseline = createSendRecoveryBaseline(currentSnapshot.value);
    const refreshSession = vi
      .fn<() => Promise<ChatSessionSnapshot | null>>()
      .mockImplementationOnce(async () => {
        currentSnapshot.value = buildSnapshot({
          events: [
            ...currentSnapshot.value.events,
            {
              event_id: "evt_002",
              session_id: "thread_001",
              event_type: "message.user",
              sequence: 2,
              occurred_at: "2026-03-27T05:15:02Z",
              payload: {
                content: "Please explain the changes.",
                message_id: "msg_user_001",
              },
            },
            {
              event_id: "evt_003",
              session_id: "thread_001",
              event_type: "session.status_changed",
              sequence: 3,
              occurred_at: "2026-03-27T05:15:03Z",
              payload: {
                from_status: "running",
                to_status: "waiting_input",
              },
            },
          ],
        });

        return currentSnapshot.value;
      })
      .mockImplementationOnce(async () => {
        currentSnapshot.value = buildSnapshot({
          session: {
            ...currentSnapshot.value.session!,
            status: "waiting_input",
            updated_at: "2026-03-27T05:15:04Z",
          },
          messages: [
            ...currentSnapshot.value.messages,
            {
              message_id: "msg_asst_001",
              session_id: "thread_001",
              role: "assistant",
              content: "Here is the explanation.",
              created_at: "2026-03-27T05:15:04Z",
            },
          ],
        });

        return currentSnapshot.value;
      });

    controller.start(
      {
        getSnapshot: () => currentSnapshot.value,
        refreshSession,
      },
      baseline,
    );

    expect(timerApi.pendingCount()).toBe(1);

    timerApi.runNext();
    await flushAsyncWork();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(timerApi.pendingCount()).toBe(1);

    timerApi.runNext();
    await flushAsyncWork();

    expect(refreshSession).toHaveBeenCalledTimes(2);
    expect(timerApi.pendingCount()).toBe(0);
  });
});
