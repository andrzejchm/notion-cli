import { Command } from 'commander';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { readGlobalConfig } from '../../config/config.js';
import { exchangeCode } from '../../oauth/oauth-client.js';
import { runOAuthFlow } from '../../oauth/oauth-flow.js';
import { saveOAuthTokens } from '../../oauth/token-store.js';
import { stderrWrite } from '../../output/stderr.js';
import { success, dim } from '../../output/color.js';

interface LoginOptions {
  profile?: string;
  manual?: boolean;
}

export function loginCommand(): Command {
  const cmd = new Command('login');

  cmd
    .description('authenticate with Notion via OAuth browser flow')
    .option('--profile <name>', 'profile name to store credentials in')
    .option('--manual', 'print auth URL instead of opening browser (for headless environments)')
    .action(
      withErrorHandling(async (opts: LoginOptions) => {
        // TTY check for interactive OAuth (unless manual mode)
        if (!process.stdin.isTTY && !opts.manual) {
          throw new CliError(
            ErrorCodes.AUTH_NO_TOKEN,
            'Cannot run interactive OAuth login in non-TTY mode.',
            'Use --manual flag to get an auth URL you can open in a browser',
          );
        }

        // Resolve profile name
        let profileName = opts.profile;
        if (!profileName) {
          const config = await readGlobalConfig();
          profileName = config.active_profile ?? 'default';
        }

        // Run the OAuth browser flow
        const result = await runOAuthFlow({ manual: opts.manual });

        // Exchange the authorization code for tokens
        const response = await exchangeCode(result.code);

        // Persist tokens
        await saveOAuthTokens(profileName, response);

        // Display success
        const userName = response.owner?.user?.name ?? 'unknown user';
        const workspaceName = response.workspace_name ?? 'unknown workspace';

        stderrWrite(success(`✓ Logged in as ${userName} to workspace ${workspaceName}`));
        stderrWrite(dim('Your comments and pages will now be attributed to your Notion account.'));
      }),
    );

  return cmd;
}
