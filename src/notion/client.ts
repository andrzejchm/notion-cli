import { Client, APIErrorCode, isNotionClientError } from '@notionhq/client';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';

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
  const notion = new Client({ auth: token });

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
    if (isNotionClientError(error) && error.code === APIErrorCode.Unauthorized) {
      throw new CliError(
        ErrorCodes.AUTH_INVALID,
        'Invalid integration token.',
        'Check your token at notion.so/profile/integrations/internal',
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
  return new Client({ auth: token });
}
