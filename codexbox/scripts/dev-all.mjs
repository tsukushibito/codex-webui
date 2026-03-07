import { spawn } from 'node:child_process';
import process from 'node:process';

const children = [];
let shuttingDown = false;

function spawnChild(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: options.cwd || process.cwd(),
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[dev:all] ${name} exited with ${detail}`);
    shutdown(typeof code === 'number' ? code : 0);
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(exitCode);
  }, 1000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

spawnChild('backend', process.execPath, ['webui-server.js'], {
  cwd: new URL('..', import.meta.url).pathname,
});
spawnChild('frontend', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: new URL('..', import.meta.url).pathname,
});
