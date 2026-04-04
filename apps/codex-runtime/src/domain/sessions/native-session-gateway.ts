import crypto from "node:crypto";
import path from "node:path";

export interface CreateNativeSessionInput {
  cwd: string;
  title: string;
}

export interface NativeSessionGateway {
  createSession(input: CreateNativeSessionInput): Promise<{ sessionId: string }>;
  interruptSessionTurn(input: { sessionId: string; turnId: string }): Promise<void>;
}

export class SyntheticNativeSessionGateway implements NativeSessionGateway {
  async createSession(_input: CreateNativeSessionInput) {
    return {
      sessionId: `thread_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  async interruptSessionTurn(_input: { sessionId: string; turnId: string }) {
    return;
  }
}

export function resolveWorkspaceSessionCwd(workspaceRoot: string, directoryName: string) {
  return path.join(workspaceRoot, directoryName);
}
