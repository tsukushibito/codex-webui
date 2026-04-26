import type { ApprovalCategory } from "../approvals/types.js";

const COMMAND_APPROVAL_METHOD = "item/commandExecution/requestApproval" as const;

type ApprovalRequestContext = Record<string, unknown> & {
  thread_id: string;
  turn_id: string;
  item_id: unknown;
  cwd: unknown;
  command_actions: unknown;
  available_decisions: unknown;
};

export interface NativeApprovalSinkInput {
  turn_id: string;
  approval_category: ApprovalCategory;
  summary: string;
  reason: string;
  operation_summary: string;
  context: ApprovalRequestContext;
  native_request_kind: typeof COMMAND_APPROVAL_METHOD;
}

export interface NativeCommandApprovalTranslation {
  sessionId: string;
  requestId: number;
  command: string;
  sinkInput: NativeApprovalSinkInput;
}

interface RawNativeCommandApprovalEvent {
  id?: unknown;
  method?: unknown;
  params?: {
    threadId?: unknown;
    turnId?: unknown;
    command?: unknown;
    itemId?: unknown;
    cwd?: unknown;
    commandActions?: unknown;
    availableDecisions?: unknown;
  };
}

function summarizeApprovalRequest(command: string) {
  return `Approval requested to run: ${command}`;
}

function reasonForApprovalRequest(command: string) {
  return `Codex requested permission to run the command: ${command}`;
}

export function translateNativeCommandApprovalEvent(
  message: RawNativeCommandApprovalEvent,
): NativeCommandApprovalTranslation | null {
  if (String(message.method) !== COMMAND_APPROVAL_METHOD) {
    return null;
  }

  const params = message.params ?? {};
  const sessionId = String(params.threadId ?? "");
  const turnId = String(params.turnId ?? "");
  const command = String(params.command ?? "");
  const requestId = Number(message.id);

  if (!sessionId || !turnId || command.length === 0 || !Number.isFinite(requestId)) {
    return null;
  }

  return {
    sessionId,
    requestId,
    command,
    sinkInput: {
      turn_id: turnId,
      approval_category: "external_side_effect",
      summary: summarizeApprovalRequest(command),
      reason: reasonForApprovalRequest(command),
      operation_summary: command,
      context: {
        thread_id: sessionId,
        turn_id: turnId,
        item_id: params.itemId ?? null,
        cwd: params.cwd ?? null,
        command_actions: params.commandActions ?? [],
        available_decisions: params.availableDecisions ?? [],
      },
      native_request_kind: COMMAND_APPROVAL_METHOD,
    },
  };
}
