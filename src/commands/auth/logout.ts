import { Command } from 'commander';
import { withErrorHandling } from '../../errors/error-handler.js';
import { readGlobalConfig } from '../../config/config.js';
import { clearOAuthTokens } from '../../oauth/token-store.js';
import { stderrWrite } from '../../output/stderr.js';
import { success, dim } from '../../output/color.js';

interface LogoutOptions {
  profile?: string;
}

export function logoutCommand(): Command {
  const cmd = new Command('logout');

  cmd
    .description('remove OAuth tokens from the active profile')
    .option('--profile <name>', 'profile name to log out from')
    .action(
      withErrorHandling(async (opts: LogoutOptions) => {
        // Resolve profile name
        let profileName = opts.profile;
        if (!profileName) {
          const config = await readGlobalConfig();
          profileName = config.active_profile ?? 'default';
        }

        // Check if profile has OAuth tokens
        const config = await readGlobalConfig();
        const profile = config.profiles?.[profileName];

        if (!profile?.oauth_access_token) {
          stderrWrite(`No OAuth session found for profile '${profileName}'.`);
          return;
        }

        // Clear OAuth tokens
        await clearOAuthTokens(profileName);

        stderrWrite(success(`✓ Logged out. OAuth tokens removed from profile '${profileName}'.`));
        stderrWrite(
          dim(
            `Internal integration token (if any) is still active. Run 'notion init' to change it.`,
          ),
        );
      }),
    );

  return cmd;
}
