import crypto from "node:crypto";
import path from "node:path";

export interface CreateNativeSessionInput {
  cwd: string;
  title: string;
}

export interface SendNativeSessionMessageInput {
  sessionId: string;
  content: string;
}

export interface NativeSessionGateway {
  createSession(input: CreateNativeSessionInput): Promise<{ sessionId: string }>;
  sendUserMessage(input: SendNativeSessionMessageInput): Promise<{
    turnId: string;
  }>;
  cancelPendingApproval(input: { sessionId: string; approvalId: string }): Promise<void>;
  resolveApproval(input: {
    sessionId: string;
    approvalId: string;
    resolution: "approved" | "denied";
  }): Promise<void>;
  interruptSessionTurn(input: { sessionId: string; turnId: string }): Promise<void>;
}

export class SyntheticNativeSessionGateway implements NativeSessionGateway {
  async createSession(_input: CreateNativeSessionInput) {
    return {
      sessionId: `thread_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  async sendUserMessage(_input: SendNativeSessionMessageInput) {
    return {
      turnId: `turn_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  async resolveApproval(_input: {
    sessionId: string;
    approvalId: string;
    resolution: "approved" | "denied";
  }) {
    return;
  }

  async cancelPendingApproval(_input: { sessionId: string; approvalId: string }) {
    return;
  }

  async interruptSessionTurn(_input: { sessionId: string; turnId: string }) {
    return;
  }
}

export function resolveWorkspaceSessionCwd(workspaceRoot: string, directoryName: string) {
  return path.join(workspaceRoot, directoryName);
}
