import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";

export interface AppServerProcessConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stopTimeoutMs?: number;
}

export interface AppServerSnapshot {
  status: "stopped" | "running" | "failed";
  command: string;
  args: string[];
  pid: number | null;
  started_at: string | null;
  exited_at: string | null;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
}

export class AppServerSupervisor {
  private child: ChildProcess | null = null;
  private startedAt: string | null = null;
  private exitedAt: string | null = null;
  private exitCode: number | null = null;
  private signal: NodeJS.Signals | null = null;
  private status: AppServerSnapshot["status"] = "stopped";
  private stopping = false;

  constructor(private readonly config: AppServerProcessConfig) {}

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

    this.child = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: this.config.env,
      stdio: "ignore",
    });

    this.child.once("exit", (code, signal) => {
      this.status = this.stopping || code === 0 ? "stopped" : "failed";
      this.exitCode = code;
      this.signal = signal;
      this.exitedAt = new Date().toISOString();
      this.child = null;
      this.stopping = false;
    });

    try {
      await once(this.child, "spawn");
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

    return this.getSnapshot();
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
}
