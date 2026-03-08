import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { chromium, devices } from 'playwright';

const PROJECT_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..');
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, '.tmp', 'ui-captures');

function parseArgs(argv) {
  const options = {};

  for (const rawArg of argv) {
    if (!rawArg.startsWith('--')) {
      continue;
    }

    const arg = rawArg.slice(2);
    const [key, value] = arg.split('=');
    options[key] = value ?? 'true';
  }

  return options;
}

function readOptions() {
  const args = parseArgs(process.argv.slice(2));

  return {
    outputDir: path.resolve(
      args['output-dir'] || process.env.UI_CAPTURE_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
    ),
    selector: args.selector || process.env.UI_CAPTURE_SELECTOR || '#app',
    skipStart: args['skip-start'] === 'true' || process.env.UI_CAPTURE_SKIP_START === '1',
    startCommand: args['start-command'] || process.env.UI_CAPTURE_START_COMMAND || 'npm run dev:all',
    theme: args.theme || process.env.UI_CAPTURE_THEME || 'system',
    timeoutMs: Number(args.timeout || process.env.UI_CAPTURE_TIMEOUT_MS || 45000),
    url: args.url || process.env.UI_CAPTURE_URL || 'http://127.0.0.1:8080/',
  };
}

async function isUrlReady(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isUrlReady(url)) {
      return true;
    }
    await sleep(500);
  }

  return false;
}

function startServer(command, outputDir) {
  const logPath = path.join(outputDir, 'capture-server.log');
  const logStream = createWriteStream(logPath, { flags: 'w' });
  const child = spawn(command, {
    cwd: PROJECT_ROOT,
    detached: process.platform !== 'win32',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  return {
    child,
    dispose: () => {
      logStream.end();
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }
      try {
        if (process.platform !== 'win32') {
          process.kill(-child.pid, 'SIGTERM');
          return;
        }
        child.kill('SIGTERM');
      } catch {
        // Ignore cleanup races when the process exits between checks.
      }
    },
    logPath,
  };
}

async function captureVariant(browser, options, variant) {
  const context = await browser.newContext(variant.contextOptions);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(String(error.message || error));
  });

  await page.addInitScript((themeMode) => {
    window.localStorage.setItem('codex-webui-theme', themeMode);
  }, options.theme);

  await page.goto(options.url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(options.selector);
  await page.waitForTimeout(2500);

  const screenshotPath = path.join(options.outputDir, `${variant.name}-${options.theme}.png`);
  await page.screenshot({
    fullPage: true,
    path: screenshotPath,
  });

  await context.close();

  return {
    consoleErrors,
    name: variant.name,
    pageErrors,
    path: screenshotPath,
  };
}

async function main() {
  const options = readOptions();
  const variants = [
    {
      contextOptions: {
        ...(options.theme === 'system' ? {} : { colorScheme: options.theme }),
        viewport: { height: 1400, width: 1440 },
      },
      name: 'desktop',
    },
    {
      contextOptions: {
        ...devices['iPhone 13'],
        ...(options.theme === 'system' ? {} : { colorScheme: options.theme }),
      },
      name: 'mobile',
    },
  ];

  await fs.mkdir(options.outputDir, { recursive: true });

  let serverHandle = null;
  const alreadyRunning = await isUrlReady(options.url);
  if (!alreadyRunning && !options.skipStart) {
    serverHandle = startServer(options.startCommand, options.outputDir);
  }

  try {
    const ready = await waitForUrl(options.url, options.timeoutMs);
    if (!ready) {
      const detail = serverHandle ? ` Server log: ${serverHandle.logPath}` : '';
      throw new Error(`Timed out waiting for ${options.url}.${detail}`);
    }

    const browser = await chromium.launch({ headless: true });
    const captures = [];

    try {
      for (const variant of variants) {
        captures.push(await captureVariant(browser, options, variant));
      }

      const reportPath = path.join(options.outputDir, `capture-${options.theme}.json`);
      await fs.writeFile(
        reportPath,
        JSON.stringify(
          {
            captures,
            generatedAt: new Date().toISOString(),
            theme: options.theme,
            url: options.url,
          },
          null,
          2,
        ),
        'utf8',
      );

      console.log(`Saved UI captures to ${options.outputDir}`);
      for (const capture of captures) {
        console.log(`${capture.name}: ${capture.path}`);
      }
      console.log(`report: ${reportPath}`);
    } finally {
      await browser.close();
    }
  } finally {
    if (serverHandle) {
      serverHandle.dispose();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
