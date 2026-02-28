import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { createInterface } from 'node:readline';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { buildAuthUrl, OAUTH_REDIRECT_URI } from './oauth-client.js';

export interface OAuthFlowResult {
  code: string;
  state: string;
}

/**
 * Opens the URL in the user's default browser using a platform-aware command.
 * Returns false if spawning the browser failed (triggers manual flow fallback).
 */
function openBrowser(url: string): boolean {
  const platform = process.platform;
  let cmd: string;
  let args: string[];

  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompts the user to paste the full redirect URL in manual mode.
 * Parses the code and state from the pasted URL.
 */
async function manualFlow(url: string): Promise<OAuthFlowResult> {
  process.stderr.write(
    `\nOpening browser to:\n  ${url}\n\nPaste the full redirect URL here (${OAUTH_REDIRECT_URI}?code=...):\n> `,
  );

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: false,
  });

  return new Promise<OAuthFlowResult>((resolve, reject) => {
    rl.once('line', (line) => {
      rl.close();
      try {
        const parsed = new URL(line.trim());
        const code = parsed.searchParams.get('code');
        const state = parsed.searchParams.get('state');
        const errorParam = parsed.searchParams.get('error');

        if (errorParam === 'access_denied') {
          reject(
            new CliError(
              ErrorCodes.AUTH_INVALID,
              'Notion OAuth access was denied.',
              'Run "notion auth login" to try again',
            ),
          );
          return;
        }

        if (!code || !state) {
          reject(
            new CliError(
              ErrorCodes.AUTH_INVALID,
              'Invalid redirect URL — missing code or state parameter.',
              'Make sure you paste the full redirect URL from the browser address bar',
            ),
          );
          return;
        }

        resolve({ code, state });
      } catch {
        reject(
          new CliError(
            ErrorCodes.AUTH_INVALID,
            'Could not parse the pasted URL.',
            'Make sure you paste the full redirect URL from the browser address bar',
          ),
        );
      }
    });

    rl.once('close', () => {
      // Handle stdin close without a line (e.g. EOF)
      reject(
        new CliError(
          ErrorCodes.AUTH_INVALID,
          'No redirect URL received.',
          'Run "notion auth login" to try again',
        ),
      );
    });
  });
}

interface CallbackContext {
  expectedState: string;
  settled: boolean;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  resolve: (result: OAuthFlowResult) => void;
  reject: (err: unknown) => void;
  server: ReturnType<typeof createServer>;
}

function handleCallbackRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: CallbackContext,
): void {
  if (ctx.settled) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<html><body><h1>Already handled. You can close this tab.</h1></body></html>',
    );
    return;
  }

  try {
    const reqUrl = new URL(req.url ?? '/', 'http://localhost:54321');
    const code = reqUrl.searchParams.get('code');
    const returnedState = reqUrl.searchParams.get('state');
    const errorParam = reqUrl.searchParams.get('error');

    if (errorParam === 'access_denied') {
      ctx.settled = true;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body><h1>Access Denied</h1><p>You cancelled the Notion OAuth request. You can close this tab.</p></body></html>',
      );
      if (ctx.timeoutHandle) clearTimeout(ctx.timeoutHandle);
      ctx.server.close(() => {
        ctx.reject(
          new CliError(
            ErrorCodes.AUTH_INVALID,
            'Notion OAuth access was denied.',
            'Run "notion auth login" to try again',
          ),
        );
      });
      return;
    }

    if (!code || !returnedState) {
      // Probably a favicon request or other unrelated GET — ignore
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><p>Waiting for OAuth callback...</p></body></html>');
      return;
    }

    if (returnedState !== ctx.expectedState) {
      ctx.settled = true;
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body><h1>Security Error</h1><p>State mismatch — possible CSRF attempt. You can close this tab.</p></body></html>',
      );
      if (ctx.timeoutHandle) clearTimeout(ctx.timeoutHandle);
      ctx.server.close(() => {
        ctx.reject(
          new CliError(
            ErrorCodes.AUTH_INVALID,
            'OAuth state mismatch — possible CSRF attempt. Aborting.',
            'Run "notion auth login" to start a fresh OAuth flow',
          ),
        );
      });
      return;
    }

    // Success
    ctx.settled = true;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<html><body><h1>Authenticated!</h1><p>You can close this tab and return to the terminal.</p></body></html>',
    );
    if (ctx.timeoutHandle) clearTimeout(ctx.timeoutHandle);
    ctx.server.close(() => {
      ctx.resolve({ code, state: returnedState });
    });
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Error processing callback</h1></body></html>');
  }
}

/**
 * Runs the full OAuth browser flow:
 * 1. Generates random state (16 hex bytes via crypto.randomBytes)
 * 2. Starts a temporary HTTP server on localhost:54321
 * 3. Opens the Notion auth URL in the user's browser (or prints it for manual flow)
 * 4. Waits for the callback redirect with ?code=&state=
 * 5. Validates state matches, responds with a success/error HTML page
 * 6. Closes the server and returns { code, state }
 *
 * If --manual flag is set or browser open fails, prints the URL and prompts
 * user to paste the full redirect URL back into the terminal.
 *
 * Throws CliError(AUTH_INVALID) if:
 *   - state mismatch (CSRF attempt)
 *   - Notion returns ?error=access_denied
 *   - Timeout after 120 seconds with no callback
 */
export async function runOAuthFlow(options?: {
  manual?: boolean;
}): Promise<OAuthFlowResult> {
  const state = randomBytes(16).toString('hex');
  const authUrl = buildAuthUrl(state);

  if (options?.manual) {
    return manualFlow(authUrl);
  }

  return new Promise<OAuthFlowResult>((resolve, reject) => {
    const ctx: CallbackContext = {
      expectedState: state,
      settled: false,
      timeoutHandle: null,
      resolve,
      reject,
      // assigned below after server is created
      server: null as unknown as ReturnType<typeof createServer>,
    };

    const server = createServer((req, res) =>
      handleCallbackRequest(req, res, ctx),
    );
    ctx.server = server;

    server.on('error', (err) => {
      if (ctx.settled) return;
      ctx.settled = true;
      if (ctx.timeoutHandle) clearTimeout(ctx.timeoutHandle);
      reject(
        new CliError(
          ErrorCodes.AUTH_INVALID,
          `Failed to start OAuth callback server: ${err.message}`,
          'Make sure port 54321 is not in use, or use --manual flag',
        ),
      );
    });

    server.listen(54321, '127.0.0.1', () => {
      const browserOpened = openBrowser(authUrl);

      if (!browserOpened) {
        server.close();
        ctx.settled = true;
        if (ctx.timeoutHandle) clearTimeout(ctx.timeoutHandle);
        manualFlow(authUrl).then(resolve, reject);
        return;
      }

      process.stderr.write(
        `\nOpening browser for Notion OAuth...\nIf your browser didn't open, visit:\n  ${authUrl}\n\nWaiting for callback (up to 120 seconds)...\n`,
      );

      ctx.timeoutHandle = setTimeout(() => {
        if (ctx.settled) return;
        ctx.settled = true;
        server.close(() => {
          reject(
            new CliError(
              ErrorCodes.AUTH_INVALID,
              'OAuth login timed out after 120 seconds.',
              'Run "notion auth login" to try again, or use --manual flag',
            ),
          );
        });
      }, 120_000);
    });
  });
}
