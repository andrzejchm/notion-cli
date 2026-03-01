import { input, select } from '@inquirer/prompts';
import { Command } from 'commander';
import { readGlobalConfig, writeGlobalConfig } from '../../config/config.js';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { exchangeCode } from '../../oauth/oauth-client.js';
import { runOAuthFlow } from '../../oauth/oauth-flow.js';
import { saveOAuthTokens } from '../../oauth/token-store.js';
import { dim, success } from '../../output/color.js';
import { stderrWrite } from '../../output/stderr.js';
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
    .option(
      '--manual',
      'print auth URL instead of opening browser (for headless OAuth)',
    )
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
          const result = await runOAuthFlow({ manual: opts.manual });
          const response = await exchangeCode(result.code);

          const userName = response.owner?.user?.name ?? 'unknown user';
          const workspaceName = response.workspace_name ?? 'unknown workspace';

          const config = await readGlobalConfig();
          const existingProfiles = config.profiles ?? {};

          let profileName = opts.profile;
          if (!profileName) {
            const suggested =
              workspaceName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'default';
            profileName = await input({
              message: 'Profile name to save this account under:',
              default: suggested,
            });
          }

          const isUpdate = Boolean(existingProfiles[profileName]);
          const isFirst = Object.keys(existingProfiles).length === 0;

          if (isUpdate) {
            stderrWrite(dim(`Updating existing profile "${profileName}"...`));
          }

          await saveOAuthTokens(profileName, response);

          // Set as active if it's the first profile saved
          if (isFirst) {
            const updated = await readGlobalConfig();
            await writeGlobalConfig({
              ...updated,
              active_profile: profileName,
            });
          }

          stderrWrite(
            success(`✓ Logged in as ${userName} to workspace ${workspaceName}`),
          );
          stderrWrite(dim(`Saved as profile "${profileName}".`));
          if (!isFirst && !isUpdate) {
            stderrWrite(
              dim(
                `Run "notion auth use ${profileName}" to switch to this profile.`,
              ),
            );
          }
          stderrWrite(
            dim(
              'Your comments and pages will now be attributed to your Notion account.',
            ),
          );
        } else {
          await runInitFlow();
        }
      }),
    );

  return cmd;
}
