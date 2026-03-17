/**
 * CLI runner helper for integration tests.
 *
 * Shells out to the built binary (dist/cli.js) and captures
 * stdout, stderr, and exit code. Does not import from src/.
 */

import { execFile } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_TIMEOUT_MS = 15_000;

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Resolves the path to dist/cli.js relative to the project root.
 *
 * This file lives at tests/integration/helpers/cli-runner.ts,
 * so the project root is three directories up.
 */
function resolveCliBinaryPath(): string {
  const thisDir = fileURLToPath(new URL('.', import.meta.url));
  return resolvePath(thisDir, '..', '..', '..', 'dist', 'cli.js');
}

/**
 * Runs the CLI binary with the given arguments and captures the result.
 *
 * Sets NOTION_API_TOKEN in the child process env to NOTION_TEST_TOKEN
 * (the CLI reads NOTION_API_TOKEN, not NOTION_TOKEN — see src/config/token.ts).
 *
 * @param args - CLI arguments (e.g. ['read', '--id', 'abc123'])
 * @returns stdout, stderr, and exitCode
 */
export function runCli(args: string[]): Promise<CliResult> {
  const cliBinary = resolveCliBinaryPath();
  const testToken = process.env.NOTION_TEST_TOKEN;

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cliBinary, ...args],
      {
        timeout: CLI_TIMEOUT_MS,
        env: {
          ...process.env,
          NOTION_API_TOKEN: testToken,
        },
      },
      (error, stdout, stderr) => {
        if (error && 'code' in error && typeof error.code === 'number') {
          // Process exited with non-zero code
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            exitCode: error.code,
          });
          return;
        }

        if (error) {
          // Other error (timeout, signal, etc.)
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? error.message,
            exitCode: 1,
          });
          return;
        }

        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: 0,
        });
      },
    );
  });
}
