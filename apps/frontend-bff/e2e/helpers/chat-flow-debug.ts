import type { Page, TestInfo } from "@playwright/test";

export type ChatFlowDebugCapture = {
  consoleLines: string[];
  networkLines: string[];
};

const trackedApiPattern =
  /\/api\/v1\/(threads\/[^/]+\/(stream|view|inputs|interrupt)|workspaces\/[^/]+\/threads|workspaces\/[^/]+\/inputs)$/;

function formatDebugPayload(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" ");
}

export async function attachChatFlowDebugArtifacts(
  testInfo: TestInfo,
  debugCapture: ChatFlowDebugCapture,
  prefix: string,
) {
  await testInfo.attach(`${prefix}-browser-console.log`, {
    body: `${debugCapture.consoleLines.join("\n")}\n`,
    contentType: "text/plain",
  });
  await testInfo.attach(`${prefix}-network.log`, {
    body: `${debugCapture.networkLines.join("\n")}\n`,
    contentType: "text/plain",
  });
}

export function installChatFlowDebugCapture(page: Page): ChatFlowDebugCapture {
  const debugCapture: ChatFlowDebugCapture = {
    consoleLines: [],
    networkLines: [],
  };

  page.on("console", (message) => {
    const text = message.text();
    if (
      !text.includes("[live-chat]") &&
      message.type() !== "error" &&
      message.type() !== "warning"
    ) {
      return;
    }

    const location = message.location();
    debugCapture.consoleLines.push(
      `[console:${message.type()}] ${text} (${location.url || "unknown"}:${location.lineNumber ?? 0}:${
        location.columnNumber ?? 0
      })`,
    );
  });

  page.on("pageerror", (error) => {
    debugCapture.consoleLines.push(`[pageerror] ${error.name}: ${error.message}`);
  });

  page.on("request", (request) => {
    const url = request.url();
    if (!trackedApiPattern.test(url)) {
      return;
    }

    debugCapture.networkLines.push(
      `[request] ${request.method()} ${url} ${formatDebugPayload({
        resource_type: request.resourceType(),
      })}`,
    );
  });

  page.on("response", (response) => {
    const url = response.url();
    if (!trackedApiPattern.test(url)) {
      return;
    }

    debugCapture.networkLines.push(
      `[response] ${response.status()} ${response.request().method()} ${url} ${formatDebugPayload({
        ok: response.ok(),
      })}`,
    );
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("/api/v1/")) {
      return;
    }

    debugCapture.networkLines.push(
      `[requestfailed] ${request.method()} ${url} ${formatDebugPayload({
        failure: request.failure()?.errorText ?? "unknown",
      })}`,
    );
  });

  return debugCapture;
}

export function sawThreadStreamRequest(debugCapture: ChatFlowDebugCapture, threadId: string) {
  return debugCapture.networkLines.some(
    (line) =>
      line.startsWith("[request]") && line.includes(`/api/v1/threads/${threadId}/stream`),
  );
}
