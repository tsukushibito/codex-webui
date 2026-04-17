import { afterEach, describe, expect, it } from "vitest";

import { resolveConfig } from "../src/config.js";

const originalBridgeFlag = process.env.CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED;

afterEach(() => {
  if (originalBridgeFlag === undefined) {
    delete process.env.CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED;
    return;
  }

  process.env.CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED = originalBridgeFlag;
});

describe("runtime config", () => {
  it("enables the app-server bridge by default", () => {
    delete process.env.CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED;

    expect(resolveConfig().appServerBridgeEnabled).toBe(true);
  });

  it("allows the bridge to be disabled explicitly", () => {
    process.env.CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED = "false";

    expect(resolveConfig().appServerBridgeEnabled).toBe(false);
  });
});
