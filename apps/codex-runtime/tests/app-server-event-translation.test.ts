import { describe, expect, it } from "vitest";

import { translateNativeCommandApprovalEvent } from "../src/domain/app-server/app-server-event-translation.js";

describe("translateNativeCommandApprovalEvent", () => {
  it("returns the normalized approval translation for a valid native command approval event", () => {
    expect(
      translateNativeCommandApprovalEvent({
        id: 42,
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thread_001",
          turnId: "turn_001",
          command: "git push origin main",
          itemId: "item_001",
          cwd: "/workspace/project",
          commandActions: ["run"],
          availableDecisions: ["approve", "deny"],
        },
      }),
    ).toEqual({
      sessionId: "thread_001",
      requestId: 42,
      command: "git push origin main",
      sinkInput: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Approval requested to run: git push origin main",
        reason: "Codex requested permission to run the command: git push origin main",
        operation_summary: "git push origin main",
        context: {
          thread_id: "thread_001",
          turn_id: "turn_001",
          item_id: "item_001",
          cwd: "/workspace/project",
          command_actions: ["run"],
          available_decisions: ["approve", "deny"],
        },
        native_request_kind: "item/commandExecution/requestApproval",
      },
    });
  });

  it("returns null when the thread id is missing", () => {
    expect(
      translateNativeCommandApprovalEvent({
        id: 42,
        method: "item/commandExecution/requestApproval",
        params: {
          turnId: "turn_001",
          command: "git push origin main",
        },
      }),
    ).toBeNull();
  });

  it("returns null when the turn id is missing", () => {
    expect(
      translateNativeCommandApprovalEvent({
        id: 42,
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thread_001",
          command: "git push origin main",
        },
      }),
    ).toBeNull();
  });

  it("returns null when the command is missing or empty", () => {
    expect(
      translateNativeCommandApprovalEvent({
        id: 42,
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thread_001",
          turnId: "turn_001",
        },
      }),
    ).toBeNull();

    expect(
      translateNativeCommandApprovalEvent({
        id: 42,
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thread_001",
          turnId: "turn_001",
          command: "",
        },
      }),
    ).toBeNull();
  });

  it("returns null when the request id is not finite", () => {
    expect(
      translateNativeCommandApprovalEvent({
        id: Number.NaN,
        method: "item/commandExecution/requestApproval",
        params: {
          threadId: "thread_001",
          turnId: "turn_001",
          command: "git push origin main",
        },
      }),
    ).toBeNull();
  });
});
