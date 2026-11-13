const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

/**
 * Run a command safely without a shell, returning stdout or null on error/timeout.
 */
async function runCmd(cmd, args = [], timeoutMs = 8000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ''}`,
      },
    });
    return stdout;
  } catch {
    return null;
  }
}

/**
 * Measure directory size in bytes using `du -sk`. Returns 0 if missing or timed out.
 */
async function getDirSizeBytes(targetPath, timeoutMs = 10000) {
  const out = await runCmd('du', ['-sk', targetPath], timeoutMs);
  if (!out) return 0;
  const match = out.trim().match(/^(\d+)\s+/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) * 1024;
}

module.exports = {
  runCmd,
  getDirSizeBytes,
};

