import { select } from '@inquirer/prompts';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { readGlobalConfig } from '../../config/config.js';
import { runOAuthFlow } from '../../oauth/oauth-flow.js';
import { exchangeCode } from '../../oauth/oauth-client.js';
import { saveOAuthTokens } from '../../oauth/token-store.js';
import { stderrWrite } from '../../output/stderr.js';
import { success, dim } from '../../output/color.js';
import { runInitFlow } from '../init.js';

/**
 * Default action for `notion auth` (no subcommand).
 * Presents an interactive selector to choose between OAuth user login
 * and internal integration token, with inline tradeoff descriptions.
 * Throws CliError in non-TTY environments.
 */
export function authDefaultAction(): () => Promise<void> {
  return withErrorHandling(async () => {
    if (!process.stdin.isTTY) {
      throw new CliError(
        ErrorCodes.AUTH_NO_TOKEN,
        'Cannot run interactive auth in non-TTY mode.',
        'Use "notion auth login" for OAuth or "notion init" for integration token',
      );
    }

    const method = await select({
      message: 'How do you want to authenticate with Notion?',
      choices: [
        {
          name: 'OAuth user login  (browser required)',
          value: 'oauth' as const,
          description:
            'Opens Notion in your browser. Comments and pages are attributed to your account. Tokens auto-refresh.',
        },
        {
          name: 'Internal integration token  (CI/headless friendly)',
          value: 'token' as const,
          description:
            'Paste a token from notion.so/profile/integrations. No browser needed. Write ops attributed to integration bot.',
        },
      ],
    });

    if (method === 'oauth') {
      const config = await readGlobalConfig();
      const profileName = config.active_profile ?? 'default';
      const result = await runOAuthFlow();
      const response = await exchangeCode(result.code);
      await saveOAuthTokens(profileName, response);
      const userName = response.owner?.user?.name ?? 'unknown user';
      const workspaceName = response.workspace_name ?? 'unknown workspace';
      stderrWrite(success(`✓ Logged in as ${userName} to workspace ${workspaceName}`));
      stderrWrite(dim('Your comments and pages will now be attributed to your Notion account.'));
    } else {
      await runInitFlow();
    }
  });
}
