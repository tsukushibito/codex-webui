import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const externalHttpUsername = process.env.PLAYWRIGHT_HTTP_USERNAME;
const externalHttpPassword = process.env.PLAYWRIGHT_HTTP_PASSWORD;
const reuseExternalStack = typeof externalBaseUrl === "string" && externalBaseUrl.length > 0;
const externalHttpCredentials =
  typeof externalHttpUsername === "string" &&
  externalHttpUsername.length > 0 &&
  typeof externalHttpPassword === "string" &&
  externalHttpPassword.length > 0
    ? {
        username: externalHttpUsername,
        password: externalHttpPassword,
      }
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseUrl || "http://127.0.0.1:3000",
    ...(externalHttpCredentials ? { httpCredentials: externalHttpCredentials } : {}),
    trace: "on-first-retry",
  },
  webServer: reuseExternalStack
    ? undefined
    : [
        {
          command:
            "rm -rf ../codex-runtime/var/playwright && mkdir -p ../codex-runtime/var/playwright/workspaces ../codex-runtime/var/playwright/data && HOST=127.0.0.1 PORT=3001 CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED=true CODEX_WEBUI_WORKSPACE_ROOT=../codex-runtime/var/playwright/workspaces CODEX_WEBUI_DATABASE_PATH=../codex-runtime/var/playwright/data/codex-runtime.sqlite CODEX_APP_SERVER_COMMAND=node CODEX_APP_SERVER_ARGS='tests/fixtures/fake-codex-app-server.mjs --turn-start-mode=pre_ack_completion' npm run dev --prefix ../codex-runtime",
          url: "http://127.0.0.1:3001/api/v1/workspaces",
          reuseExistingServer: false,
          timeout: 180_000,
        },
        {
          command:
            "CODEX_WEBUI_RUNTIME_BASE_URL=http://127.0.0.1:3001 npm run dev -- --hostname 127.0.0.1 --port 3000",
          url: "http://127.0.0.1:3000/",
          reuseExistingServer: false,
          timeout: 180_000,
        },
      ],
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
