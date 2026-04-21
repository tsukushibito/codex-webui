// @vitest-environment jsdom

import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HomeResponse } from "../src/runtime-types";

const homeDataMocks = vi.hoisted(() => ({
  createWorkspaceFromHome: vi.fn(),
  fetchHomeData: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock("../src/home-data", () => ({
  createWorkspaceFromHome: homeDataMocks.createWorkspaceFromHome,
  fetchHomeData: homeDataMocks.fetchHomeData,
}));

import { HomePageClient } from "../src/home-page-client";

class MockEventSource {
  static instances: MockEventSource[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  readonly close = vi.fn();

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }
}

function buildHome(overrides: Partial<HomeResponse> = {}): HomeResponse {
  return {
    workspaces: [
      {
        workspace_id: "ws_alpha",
        workspace_name: "alpha",
        created_at: "2026-03-27T05:12:34Z",
        updated_at: "2026-03-27T05:22:00Z",
        active_session_summary: null,
        pending_approval_count: 0,
      },
    ],
    resume_candidates: [],
    updated_at: "2026-03-27T05:22:00Z",
    ...overrides,
  };
}

async function flushUi() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("HomePageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    MockEventSource.instances = [];
    homeDataMocks.createWorkspaceFromHome.mockReset();
    homeDataMocks.fetchHomeData.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT;
  });

  it("uses notification events to refresh Home and surface high-priority background work", async () => {
    homeDataMocks.fetchHomeData.mockResolvedValueOnce(buildHome()).mockResolvedValueOnce(
      buildHome({
        resume_candidates: [
          {
            thread_id: "thread_approval",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "running",
              active_flags: ["waiting_on_request"],
              latest_turn_status: "running",
            },
            updated_at: "2026-03-27T05:23:00Z",
            current_activity: {
              kind: "waiting_on_approval",
              label: "Approval required",
            },
            badge: {
              kind: "approval_required",
              label: "Approval required",
            },
            blocked_cue: {
              kind: "approval_required",
              label: "Needs your response",
            },
            resume_cue: {
              reason_kind: "waiting_on_approval",
              priority_band: "highest",
              label: "Resume here first",
            },
          },
        ],
      }),
    );

    await act(async () => {
      root.render(<HomePageClient />);
    });
    await flushUi();

    expect(MockEventSource.instances[0]?.url).toBe("/api/v1/notifications/stream");

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            thread_id: "thread_approval",
            event_type: "approval.requested",
            occurred_at: "2026-03-27T05:23:00Z",
            high_priority: true,
          }),
        }),
      );
    });
    await flushUi();

    expect(homeDataMocks.fetchHomeData).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("High-priority background thread needs attention.");
    expect(container.textContent).toContain("Resume here first");
    expect(container.textContent).toContain("Needs your response");
  });
});
