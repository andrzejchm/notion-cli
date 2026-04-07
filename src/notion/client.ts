import {
  APIErrorCode,
  Client,
  isNotionClientError,
  LogLevel,
} from '@notionhq/client';
import type { Logger } from '@notionhq/client/build/src/logging.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';

/**
 * Custom logger that routes all SDK log output to stderr.
 * Prevents SDK warning/info messages from polluting stdout when using --json flag.
 */
const stderrLogger: Logger = (level, message, extraInfo) => {
  process.stderr.write(
    `[notion-sdk] ${level}: ${message} ${JSON.stringify(extraInfo)}\n`,
  );
};

export interface WorkspaceInfo {
  workspaceName: string;
  workspaceId: string;
}

/**
 * Validates a Notion integration token by calling users.me().
 * Returns workspace name and ID on success.
 * Throws CliError(AUTH_INVALID) on unauthorized error.
 */
export async function validateToken(token: string): Promise<WorkspaceInfo> {
  const notion = new Client({
    auth: token,
    logLevel: LogLevel.WARN,
    logger: stderrLogger,
  });

  try {
    const me = await notion.users.me({});
    // Bot user response contains workspace_name and workspace_id
    const bot = me as unknown as {
      type: string;
      bot?: { workspace_name?: string; workspace_id?: string };
    };

    const workspaceName = bot.bot?.workspace_name ?? 'Unknown Workspace';
    const workspaceId = bot.bot?.workspace_id ?? '';

    return { workspaceName, workspaceId };
  } catch (error) {
    if (
      isNotionClientError(error) &&
      error.code === APIErrorCode.Unauthorized
    ) {
      // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
      throw new CliError(
        ErrorCodes.AUTH_INVALID,
        'Invalid integration token.',
        'Check your token at notion.so/profile/integrations/internal',
        error,
      );
    }
    throw error;
  }
}

/**
 * Creates an authenticated Notion client.
 * Used by all commands that need to interact with the Notion API.
 */
export function createNotionClient(token: string): Client {
  return new Client({
    auth: token,
    timeoutMs: 120_000,
    logLevel: LogLevel.WARN,
    logger: stderrLogger,
  });
}
