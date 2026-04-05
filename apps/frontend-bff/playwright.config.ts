import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "mkdir -p ../codex-runtime/var/playwright/workspaces ../codex-runtime/var/playwright/data && HOST=127.0.0.1 PORT=3001 CODEX_WEBUI_WORKSPACE_ROOT=../codex-runtime/var/playwright/workspaces CODEX_WEBUI_DATABASE_PATH=../codex-runtime/var/playwright/data/codex-runtime.sqlite CODEX_APP_SERVER_COMMAND=node CODEX_APP_SERVER_ARGS='-e process.exit(0)' npm run dev --prefix ../codex-runtime",
      url: "http://127.0.0.1:3001/api/v1/workspaces",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "CODEX_WEBUI_RUNTIME_BASE_URL=http://127.0.0.1:3001 npm run dev -- --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000/",
      reuseExistingServer: true,
      timeout: 120_000,
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
