import { type ChildProcessByStdio, spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface, type Interface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import { logLiveChatDebug } from "../../debug.js";
import { RuntimeError } from "../../errors.js";
import type { ApprovalCategory } from "../approvals/types.js";
import type {
  CreateNativeSessionInput,
  NativeSessionGateway,
  SendNativeSessionMessageInput,
} from "../sessions/native-session-gateway.js";
import type { AppServerController, AppServerSnapshot } from "./app-server-supervisor.js";

export interface CodexAppServerGatewayConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stopTimeoutMs?: number;
  approvalPolicy: string;
  sandbox: string;
  personality: string;
  protocolVersion?: string;
  clientName?: string;
  clientVersion?: string;
}

export interface NativeSessionEventSink {
  ingestApprovalRequest(
    sessionId: string,
    input: {
      turn_id: string;
      approval_category: ApprovalCategory;
      summary: string;
      reason: string;
      operation_summary?: string;
      context?: Record<string, unknown>;
      native_request_kind: string;
    },
  ): Promise<{ approval_id: string }>;
  ingestAssistantDelta(
    sessionId: string,
    input: {
      turn_id: string;
      delta: string;
    },
  ): Promise<unknown>;
  applyAssistantMessageCompletion(
    sessionId: string,
    input: {
      turn_id: string;
      content: string;
    },
  ): Promise<unknown>;
  completeTurnWithoutAssistantMessage?(
    sessionId: string,
    input: {
      turn_id: string;
    },
  ): Promise<unknown>;
  convergeSessionWaitingForInput?(
    sessionId: string,
    input: {
      native_event_name: string;
    },
  ): Promise<unknown>;
}

interface PendingRequest {
  id: number;
  method: string;
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
}

interface PendingApprovalRequest {
  requestId: number;
}

interface TurnState {
  hasFinalAssistantMessage: boolean;
  waitingForApproval: boolean;
}

interface PendingTurnStartConvergence {
  turnId: string | null;
  queuedEvents: any[];
}

function turnStateKey(sessionId: string, turnId: string) {
  return `${sessionId}:${turnId}`;
}

function mapApprovalDecision(resolution: "approved" | "denied") {
  return resolution === "approved" ? "accept" : "cancel";
}

function summarizeApprovalRequest(command: string) {
  return `Approval requested to run: ${command}`;
}

function reasonForApprovalRequest(command: string) {
  return `Codex requested permission to run the command: ${command}`;
}

export class CodexAppServerGateway implements NativeSessionGateway, AppServerController {
  private child: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
  private lineReader: Interface | null = null;
  private stderrReader: Interface | null = null;
  private startedAt: string | null = null;
  private exitedAt: string | null = null;
  private exitCode: number | null = null;
  private signal: NodeJS.Signals | null = null;
  private status: AppServerSnapshot["status"] = "stopped";
  private stopping = false;
  private requestId = 1;
  private pendingRequests = new Map<number, PendingRequest>();
  private pendingApprovals = new Map<string, PendingApprovalRequest>();
  private itemPhases = new Map<string, string>();
  private turnStates = new Map<string, TurnState>();
  private pendingTurnStartConvergence = new Map<string, PendingTurnStartConvergence>();
  private eventSink: NativeSessionEventSink | null = null;
  private startPromise: Promise<AppServerSnapshot> | null = null;
  private eventChain = Promise.resolve();

  constructor(private readonly config: CodexAppServerGatewayConfig) {}

  bindEventSink(eventSink: NativeSessionEventSink) {
    this.eventSink = eventSink;
  }

  getSnapshot(): AppServerSnapshot {
    return {
      status: this.status,
      command: this.config.command,
      args: this.config.args,
      pid: this.child?.pid ?? null,
      started_at: this.startedAt,
      exited_at: this.exitedAt,
      exit_code: this.exitCode,
      signal: this.signal,
    };
  }

  async ensureStarted() {
    if (this.child && this.status === "running") {
      return this.getSnapshot();
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.start();

    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async stop(signal: NodeJS.Signals = "SIGTERM") {
    if (!this.child) {
      return this.getSnapshot();
    }

    const child = this.child;
    const stopTimeoutMs = this.config.stopTimeoutMs ?? 2_000;
    this.stopping = true;
    child.kill(signal);

    await Promise.race([
      once(child, "exit"),
      new Promise((resolve) => setTimeout(resolve, stopTimeoutMs)),
    ]);

    if (this.child) {
      child.kill("SIGKILL");
      await once(child, "exit");
    }

    return this.getSnapshot();
  }

  async createSession(input: CreateNativeSessionInput) {
    const result = await this.sendRequest("thread/start", {
      cwd: input.cwd,
      approvalPolicy: this.config.approvalPolicy,
      sandbox: this.config.sandbox,
      personality: this.config.personality,
    });

    return {
      sessionId: String(result.thread.id),
    };
  }

  async sendUserMessage(input: SendNativeSessionMessageInput) {
    this.pendingTurnStartConvergence.set(input.sessionId, {
      turnId: null,
      queuedEvents: [],
    });

    const result = await this.sendRequest("turn/start", {
      threadId: input.sessionId,
      input: [
        {
          type: "text",
          text: input.content,
        },
      ],
    });

    const turnId = String(result.turn.id);
    const pending = this.pendingTurnStartConvergence.get(input.sessionId);
    if (pending) {
      pending.turnId = turnId;
    }

    return {
      turnId,
    };
  }

  async acknowledgeTurnStartPersisted(input: { sessionId: string; turnId: string }) {
    const pending = this.pendingTurnStartConvergence.get(input.sessionId);
    if (!pending || pending.turnId !== input.turnId) {
      return;
    }

    this.pendingTurnStartConvergence.delete(input.sessionId);
    const replayEvents = this.sortDeferredTurnEvents(pending.queuedEvents);
    this.eventChain = this.eventChain
      .then(async () => {
        for (const event of replayEvents) {
          await this.handleEvent(event);
        }
      })
      .catch(() => {
        // Keep replay failures isolated from the request path.
      });
  }

  async cancelPendingApproval(input: { sessionId: string; approvalId: string }) {
    await this.resolvePendingApproval(input.approvalId, "cancel");
  }

  async resolveApproval(input: {
    sessionId: string;
    approvalId: string;
    resolution: "approved" | "denied";
  }) {
    await this.resolvePendingApproval(input.approvalId, mapApprovalDecision(input.resolution));
  }

  async interruptSessionTurn(input: { sessionId: string; turnId: string }) {
    await this.sendRequest("turn/interrupt", {
      threadId: input.sessionId,
      turnId: input.turnId,
    });
  }

  private async start() {
    const child = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: this.config.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    logLiveChatDebug("app-server", "spawned codex app-server child", {
      command: this.config.command,
      args: this.config.args,
      cwd: this.config.cwd ?? null,
    });

    this.child = child;
    this.lineReader = createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });
    this.lineReader.on("line", (line) => {
      this.handleLine(line);
    });
    this.stderrReader = createInterface({
      input: child.stderr,
      crlfDelay: Infinity,
    });
    this.stderrReader.on("line", (line) => {
      logLiveChatDebug("app-server", "stderr", {
        line,
      });
    });

    child.once("exit", (code, signal) => {
      logLiveChatDebug("app-server", "child exited", {
        code,
        signal: signal ?? null,
        stopping: this.stopping,
      });
      this.status = this.stopping || code === 0 ? "stopped" : "failed";
      this.exitCode = code;
      this.signal = signal;
      this.exitedAt = new Date().toISOString();
      this.child = null;
      this.lineReader?.close();
      this.lineReader = null;
      this.stderrReader?.close();
      this.stderrReader = null;
      this.stopping = false;

      for (const pending of this.pendingRequests.values()) {
        pending.reject(new Error("codex app-server exited before the request completed"));
      }
      this.pendingRequests.clear();
    });

    try {
      await once(child, "spawn");
    } catch (error) {
      this.status = "failed";
      this.exitCode = null;
      this.signal = null;
      this.exitedAt = new Date().toISOString();
      throw error;
    }

    this.status = "running";
    this.startedAt = new Date().toISOString();
    this.exitedAt = null;
    this.exitCode = null;
    this.signal = null;
    this.stopping = false;

    await this.sendRequestInternal("initialize", {
      protocolVersion: this.config.protocolVersion ?? "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: this.config.clientName ?? "codex-webui",
        version: this.config.clientVersion ?? "0.1.0",
      },
    });
    this.sendNotification("notifications/initialized", {});

    logLiveChatDebug("app-server", "initialized codex app-server bridge");

    return this.getSnapshot();
  }

  private handleLine(line: string) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    let message: any;
    try {
      message = JSON.parse(trimmed);
    } catch {
      return;
    }

    if (
      typeof message.id === "number" &&
      (message.result !== undefined || message.error !== undefined)
    ) {
      const pending = this.pendingRequests.get(message.id);

      logLiveChatDebug("app-server", "received rpc response", {
        id: message.id,
        method: pending?.method ?? null,
        has_error: message.error !== undefined,
      });
      if (!pending) {
        return;
      }

      this.pendingRequests.delete(message.id);
      if (message.error) {
        logLiveChatDebug("app-server", "received rpc error response", {
          id: message.id,
          method: pending.method,
          code: message.error.code ?? null,
          message: message.error.message ?? "codex app-server request failed",
          data: message.error.data ?? null,
        });
        pending.reject(
          new RuntimeError(
            502,
            "app_server_request_failed",
            String(message.error.message ?? "codex app-server request failed"),
            {
              rpc_request_id: message.id,
              rpc_method: pending.method,
              rpc_error_code: message.error.code ?? null,
              rpc_error_data: message.error.data ?? null,
            },
          ),
        );
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (typeof message.method !== "string") {
      return;
    }

    logLiveChatDebug("app-server", "received rpc event", {
      method: message.method,
      thread_id: message.params?.threadId ?? null,
      turn_id: message.params?.turnId ?? message.params?.turn?.id ?? null,
      item_type: message.params?.item?.type ?? null,
      item_phase: message.params?.item?.phase ?? null,
    });

    this.eventChain = this.eventChain
      .then(() => this.handleEvent(message))
      .catch(() => {
        // Ignore event processing failures so the stream can continue.
      });
  }

  private async handleEvent(message: any) {
    if (!this.eventSink) {
      return;
    }

    const method = String(message.method);
    const params = message.params ?? {};
    const sessionId = String(params.threadId ?? "");
    const turnId = String(params.turnId ?? params.turn?.id ?? "");

    if (this.shouldDeferTurnEvent(method, sessionId, turnId)) {
      this.pendingTurnStartConvergence.get(sessionId)?.queuedEvents.push(message);
      return;
    }

    if (method === "turn/started") {
      if (sessionId && turnId) {
        this.turnStates.set(turnStateKey(sessionId, turnId), {
          hasFinalAssistantMessage: false,
          waitingForApproval: false,
        });
      }
      return;
    }

    if (method === "thread/status/changed") {
      const statusType = String(params.status?.type ?? "");
      if (sessionId && statusType === "idle" && this.eventSink.convergeSessionWaitingForInput) {
        await this.eventSink.convergeSessionWaitingForInput(sessionId, {
          native_event_name: "thread/status/changed",
        });
      }
      return;
    }

    if (method === "item/started" && params.item?.type === "agentMessage") {
      this.itemPhases.set(String(params.item.id), String(params.item.phase ?? ""));
      return;
    }

    if (method === "item/agentMessage/delta") {
      if (this.itemPhases.get(String(params.itemId)) !== "final_answer") {
        return;
      }

      const delta = String(params.delta ?? "");
      if (!sessionId || !turnId || delta.length === 0) {
        return;
      }

      this.markTurnHasFinalAssistantMessage(sessionId, turnId);
      logLiveChatDebug("app-server", "forwarding assistant delta", {
        session_id: sessionId,
        turn_id: turnId,
        delta_length: delta.length,
      });
      await this.eventSink.ingestAssistantDelta(sessionId, {
        turn_id: turnId,
        delta,
      });
      return;
    }

    if (method === "item/completed" && params.item?.type === "agentMessage") {
      this.itemPhases.delete(String(params.item.id));
      if (String(params.item.phase ?? "") !== "final_answer") {
        return;
      }

      const content = String(params.item.text ?? "");
      if (!sessionId || !turnId || content.length === 0) {
        return;
      }

      this.markTurnHasFinalAssistantMessage(sessionId, turnId);
      logLiveChatDebug("app-server", "forwarding assistant completion", {
        session_id: sessionId,
        turn_id: turnId,
        content_length: content.length,
      });
      await this.eventSink.applyAssistantMessageCompletion(sessionId, {
        turn_id: turnId,
        content,
      });
      return;
    }

    if (method === "item/commandExecution/requestApproval") {
      const command = String(params.command ?? "");
      const requestId = Number(message.id);
      if (!sessionId || !turnId || !Number.isFinite(requestId) || command.length === 0) {
        return;
      }

      const state = this.ensureTurnState(sessionId, turnId);
      state.waitingForApproval = true;

      logLiveChatDebug("app-server", "forwarding approval request", {
        session_id: sessionId,
        turn_id: turnId,
        command,
      });

      const approval = await this.eventSink.ingestApprovalRequest(sessionId, {
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
        native_request_kind: "item/commandExecution/requestApproval",
      });

      this.pendingApprovals.set(approval.approval_id, {
        requestId,
      });
      return;
    }

    if (method === "turn/completed") {
      const status = String(params.turn?.status ?? "");
      if (!sessionId || !turnId) {
        return;
      }

      const key = turnStateKey(sessionId, turnId);
      const state = this.turnStates.get(key);
      this.turnStates.delete(key);

      if (
        status === "completed" &&
        !state?.hasFinalAssistantMessage &&
        !state?.waitingForApproval &&
        this.eventSink.completeTurnWithoutAssistantMessage
      ) {
        logLiveChatDebug("app-server", "turn completed without assistant message", {
          session_id: sessionId,
          turn_id: turnId,
        });
        await this.eventSink.completeTurnWithoutAssistantMessage(sessionId, {
          turn_id: turnId,
        });
      }
    }
  }

  private shouldDeferTurnEvent(method: string, sessionId: string, turnId: string) {
    if (!sessionId) {
      return false;
    }

    const pending = this.pendingTurnStartConvergence.get(sessionId);
    if (!pending) {
      return false;
    }

    switch (method) {
      case "turn/started":
      case "thread/status/changed":
      case "item/started":
      case "item/agentMessage/delta":
      case "item/completed":
      case "item/commandExecution/requestApproval":
      case "turn/completed":
        return pending.turnId === null || pending.turnId === turnId;
      default:
        return false;
    }
  }

  private sortDeferredTurnEvents(events: any[]) {
    const eventPriority = (message: any) => {
      const method = String(message.method);
      if (method === "thread/status/changed") {
        return String(message.params?.status?.type ?? "") === "idle" ? 5 : 0;
      }

      switch (method) {
        case "turn/started":
          return 1;
        case "item/started":
          return 2;
        case "item/agentMessage/delta":
          return 3;
        case "item/completed":
          return 4;
        case "item/commandExecution/requestApproval":
          return 4;
        case "turn/completed":
          return 6;
        default:
          return 0;
      }
    };

    return [...events].sort((left, right) => eventPriority(left) - eventPriority(right));
  }

  private ensureTurnState(sessionId: string, turnId: string) {
    const key = turnStateKey(sessionId, turnId);
    const existing = this.turnStates.get(key);
    if (existing) {
      return existing;
    }

    const created: TurnState = {
      hasFinalAssistantMessage: false,
      waitingForApproval: false,
    };
    this.turnStates.set(key, created);
    return created;
  }

  private markTurnHasFinalAssistantMessage(sessionId: string, turnId: string) {
    const state = this.ensureTurnState(sessionId, turnId);
    state.hasFinalAssistantMessage = true;
  }

  private async resolvePendingApproval(approvalId: string, decision: "accept" | "cancel") {
    await this.ensureStarted();
    const pendingApproval = this.pendingApprovals.get(approvalId);
    if (!pendingApproval) {
      return;
    }

    this.pendingApprovals.delete(approvalId);
    this.writeMessage({
      id: pendingApproval.requestId,
      result: {
        decision,
      },
    });
  }

  private sendNotification(method: string, params: Record<string, unknown>) {
    this.writeMessage({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  private async sendRequest(method: string, params: Record<string, unknown>) {
    await this.ensureStarted();
    return this.sendRequestInternal(method, params);
  }

  private async sendRequestInternal(method: string, params: Record<string, unknown>) {
    const requestId = this.requestId++;
    logLiveChatDebug("app-server", "sending rpc request", {
      id: requestId,
      method,
      thread_id: params.threadId ?? null,
      turn_id: params.turnId ?? null,
    });
    const response = new Promise<any>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        id: requestId,
        method,
        resolve,
        reject,
      });
    });

    this.writeMessage({
      jsonrpc: "2.0",
      id: requestId,
      method,
      params,
    });

    return response;
  }

  private writeMessage(message: Record<string, unknown>) {
    if (!this.child?.stdin.writable) {
      throw new Error("codex app-server stdin is not writable");
    }

    if (typeof message.method === "string") {
      logLiveChatDebug("app-server", "writing rpc message", {
        id: message.id ?? null,
        method: message.method,
      });
    }

    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }
}
