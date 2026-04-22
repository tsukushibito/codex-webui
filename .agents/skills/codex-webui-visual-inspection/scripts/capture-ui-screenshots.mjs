#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const appDir = path.join(repoRoot, "apps", "frontend-bff");

const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    fullPage: true,
    outDir: path.join(repoRoot, "artifacts", "visual-inspection", timestamp),
    routes: [],
    waitMs: 750,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--base-url" && next) {
      options.baseUrl = next;
      index += 1;
      continue;
    }

    if (arg === "--out" && next) {
      options.outDir = path.resolve(repoRoot, next);
      index += 1;
      continue;
    }

    if (arg === "--route" && next) {
      options.routes.push(parseRoute(next));
      index += 1;
      continue;
    }

    if (arg === "--wait-ms" && next) {
      const waitMs = Number.parseInt(next, 10);
      if (Number.isNaN(waitMs) || waitMs < 0) {
        throw new Error(`Invalid --wait-ms value: ${next}`);
      }
      options.waitMs = waitMs;
      index += 1;
      continue;
    }

    if (arg === "--no-full-page") {
      options.fullPage = false;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  if (options.routes.length === 0) {
    options.routes.push({ label: "home", route: "/" });
  }

  return options;
}

function parseRoute(value) {
  const separator = value.lastIndexOf("=");
  if (separator > 0 && separator < value.length - 1) {
    return {
      label: slugify(value.slice(separator + 1)),
      route: value.slice(0, separator),
    };
  }

  return {
    label: slugify(value === "/" ? "home" : value),
    route: value,
  };
}

function slugify(value) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function buildUrl(baseUrl, route) {
  if (/^https?:\/\//.test(route)) {
    return route;
  }

  return new URL(route, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function printHelp() {
  console.log(`Capture codex-webui screenshots.

Usage:
  node .agents/skills/codex-webui-visual-inspection/scripts/capture-ui-screenshots.mjs [options]

Options:
  --base-url <url>       App URL. Defaults to PLAYWRIGHT_BASE_URL or http://127.0.0.1:3000.
  --route <path[=name]>  Route or absolute URL to capture. Repeatable. Defaults to /.
  --out <dir>            Output directory. Defaults to artifacts/visual-inspection/<timestamp>.
  --wait-ms <ms>         Delay after page load before screenshot. Defaults to 750.
  --no-full-page         Capture viewport only instead of full page.
  -h, --help             Show this help.
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requireFromApp = createRequire(path.join(appDir, "package.json"));
  const { chromium, devices } = requireFromApp("playwright");
  const viewportProfiles = [
    {
      name: "desktop-chromium",
      context: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: "mobile-chromium",
      context: {
        ...devices["Pixel 7"],
      },
    },
  ];

  await mkdir(options.outDir, { recursive: true });

  const httpCredentials =
    process.env.PLAYWRIGHT_HTTP_USERNAME && process.env.PLAYWRIGHT_HTTP_PASSWORD
      ? {
          username: process.env.PLAYWRIGHT_HTTP_USERNAME,
          password: process.env.PLAYWRIGHT_HTTP_PASSWORD,
        }
      : undefined;

  const browser = await chromium.launch({ headless: true });
  const captures = [];

  try {
    for (const profile of viewportProfiles) {
      const context = await browser.newContext({
        ...profile.context,
        ...(httpCredentials ? { httpCredentials } : {}),
      });

      try {
        const page = await context.newPage();

        for (const routeEntry of options.routes) {
          const url = buildUrl(options.baseUrl, routeEntry.route);
          const fileName = `${profile.name}-${routeEntry.label}.png`;
          const screenshotPath = path.join(options.outDir, fileName);

          await page.goto(url, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(options.waitMs);
          await page.screenshot({ fullPage: options.fullPage, path: screenshotPath });

          captures.push({
            file: path.relative(repoRoot, screenshotPath),
            fullPage: options.fullPage,
            profile: profile.name,
            route: routeEntry.route,
            url,
          });
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    baseUrl: options.baseUrl,
    captures,
    createdAt: new Date().toISOString(),
    waitMs: options.waitMs,
  };

  await writeFile(path.join(options.outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${captures.length} screenshots to ${path.relative(repoRoot, options.outDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
