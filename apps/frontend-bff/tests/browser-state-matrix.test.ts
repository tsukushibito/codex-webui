import { describe, expect, it } from "vitest";

import {
  type BrowserCriticalStateId,
  type BrowserCriticalStateMatrixEntry,
  browserAdjacentCompatibilityBehaviors,
  browserCriticalStateMatrix,
} from "../src/browser-state-matrix";
import { mapNotificationEvent } from "../src/mappings";

const requiredStateIds: BrowserCriticalStateId[] = [
  "home_overview",
  "workspace_thread_navigation",
  "thread_list_item",
  "thread_view",
  "timeline",
  "pending_request",
  "request_detail",
  "request_response",
  "thread_stream",
  "global_notifications",
];

function matrixEntry(stateId: BrowserCriticalStateId): BrowserCriticalStateMatrixEntry {
  const entry = browserCriticalStateMatrix.find((item) => item.state_id === stateId);
  expect(entry).toBeDefined();

  return entry!;
}

function searchableMatrixText() {
  const collected: string[] = [];

  function collect(value: unknown, key = "") {
    if (key === "request_kind_values") {
      return;
    }

    if (typeof value === "string") {
      collected.push(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        collect(item);
      }
      return;
    }

    if (value && typeof value === "object") {
      for (const [nextKey, nextValue] of Object.entries(value)) {
        collect(nextValue, nextKey);
      }
    }
  }

  collect(browserCriticalStateMatrix);

  return collected.join("\n").toLowerCase();
}

describe("browser-critical state matrix", () => {
  it("covers each browser-critical v0.9 state once with typed contract fields", () => {
    expect(browserCriticalStateMatrix.map((entry) => entry.state_id)).toEqual(requiredStateIds);

    for (const entry of browserCriticalStateMatrix) {
      expect(entry.public_source).toMatch(/^GET |^POST /);
      expect(entry.public_read_model_type).toMatch(/^[A-Z]/);
      expect(typeof entry.canonical).toBe("boolean");
      expect(entry.ordering_basis.length).toBeGreaterThan(0);
      expect(entry.projection_kind.length).toBeGreaterThan(0);
      expect(entry.notes.length).toBeGreaterThan(0);
    }
  });

  it("freezes canonical and non-canonical projection rules", () => {
    expect(matrixEntry("workspace_thread_navigation")).toMatchObject({
      canonical: true,
      canonical_model: "thread",
      projection_kind: "canonical",
      public_read_model_type: "PublicThread",
    });

    for (const stateId of [
      "thread_view",
      "timeline",
      "pending_request",
      "request_detail",
      "request_response",
      "thread_stream",
      "global_notifications",
    ] satisfies BrowserCriticalStateId[]) {
      expect(matrixEntry(stateId).canonical).toBe(false);
    }

    expect(matrixEntry("thread_list_item")).toMatchObject({
      canonical: false,
      projection_kind: "display",
    });
    expect(matrixEntry("thread_view").notes.join(" ")).toContain(
      "composer.accepting_user_input is a display hint only",
    );
  });

  it("uses thread_id plus sequence for stream and timeline convergence", () => {
    expect(matrixEntry("timeline")).toMatchObject({
      ordering_basis: "thread_id+sequence",
      projection_kind: "transport",
    });
    expect(matrixEntry("thread_stream")).toMatchObject({
      ordering_basis: "thread_id+sequence",
      projection_kind: "transport",
    });
  });

  it("keeps notification_event as a refresh trigger without canonical ordering semantics", () => {
    const entry = matrixEntry("global_notifications");

    expect(entry).toMatchObject({
      public_read_model_type: "PublicNotificationEvent",
      canonical: false,
      ordering_basis: "refresh_trigger_only",
      projection_kind: "transport",
      canonical_model: null,
    });
    expect(entry.notes.join(" ")).toContain("non-authoritative refresh trigger");
    expect(entry.notes.join(" ")).toContain("carries no sequence semantics");
  });

  it("maps notification events to refresh-trigger fields only", () => {
    const mapped = mapNotificationEvent({
      thread_id: "thread_001",
      event_type: "thread.updated",
      occurred_at: "2026-04-21T05:00:00Z",
      high_priority: true,
    });

    expect(mapped).toEqual({
      thread_id: "thread_001",
      event_type: "thread.updated",
      occurred_at: "2026-04-21T05:00:00Z",
      high_priority: true,
    });
    expect(mapped).not.toHaveProperty("sequence");
    expect(mapped).not.toHaveProperty("canonical");
    expect(mapped).not.toHaveProperty("state");
  });

  it("keeps primary legacy session and standalone approval vocabulary out of the matrix", () => {
    const text = searchableMatrixText();

    expect(text).not.toMatch(/(^|[^a-z])sessions?([^a-z]|$)|\/sessions?\b|session_/);
    expect(text).not.toMatch(/(^|[^a-z])approvals?([^a-z]|$)|\/approvals?\b|approval_/);

    expect(matrixEntry("pending_request").request_kind_values).toContain("approval");
    expect(matrixEntry("request_detail").request_kind_values).toContain("approval");
    expect(matrixEntry("request_response").request_kind_values).toContain("approval");
  });

  it("marks legacy route families as compatibility behavior for follow-up 168", () => {
    expect(
      browserAdjacentCompatibilityBehaviors.every(
        (behavior) =>
          behavior.classification === "non_browser_critical_compatibility" &&
          behavior.follow_up_issue === 168,
      ),
    ).toBe(true);
    expect(browserAdjacentCompatibilityBehaviors.map((behavior) => behavior.route_family)).toEqual([
      "/api/v1/workspaces/{workspace_id}/sessions and /api/v1/sessions/{session_id}/*",
      "/api/v1/approvals*",
    ]);
  });
});
