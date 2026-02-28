import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { readGlobalConfig } from '../../config/config.js';
import { exchangeCode } from '../../oauth/oauth-client.js';
import { runOAuthFlow } from '../../oauth/oauth-flow.js';
import { saveOAuthTokens } from '../../oauth/token-store.js';
import { stderrWrite } from '../../output/stderr.js';
import { success, dim } from '../../output/color.js';
import { runInitFlow } from '../init.js';

interface LoginOptions {
  profile?: string;
  manual?: boolean;
}

export function loginCommand(): Command {
  const cmd = new Command('login');

  cmd
    .description('authenticate with Notion — choose OAuth or integration token')
    .option('--profile <name>', 'profile name to store credentials in')
    .option('--manual', 'print auth URL instead of opening browser (for headless OAuth)')
    .action(
      withErrorHandling(async (opts: LoginOptions) => {
        if (!process.stdin.isTTY && !opts.manual) {
          throw new CliError(
            ErrorCodes.AUTH_NO_TOKEN,
            'Cannot run interactive login in non-TTY mode.',
            'Use --manual flag to get an auth URL you can open in a browser',
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
          let profileName = opts.profile;
          if (!profileName) {
            const config = await readGlobalConfig();
            profileName = config.active_profile ?? 'default';
          }

          const result = await runOAuthFlow({ manual: opts.manual });
          const response = await exchangeCode(result.code);
          await saveOAuthTokens(profileName, response);

          const userName = response.owner?.user?.name ?? 'unknown user';
          const workspaceName = response.workspace_name ?? 'unknown workspace';
          stderrWrite(success(`✓ Logged in as ${userName} to workspace ${workspaceName}`));
          stderrWrite(dim('Your comments and pages will now be attributed to your Notion account.'));
        } else {
          await runInitFlow();
        }
      }),
    );

  return cmd;
}
