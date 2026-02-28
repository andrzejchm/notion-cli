import { Command } from 'commander';
import { readGlobalConfig } from '../../config/config.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { error as colorError, dim, success } from '../../output/color.js';
import { stderrWrite } from '../../output/stderr.js';

interface StatusOptions {
  profile?: string;
}

export function statusCommand(): Command {
  const cmd = new Command('status');

  cmd
    .description('show authentication status for the active profile')
    .option('--profile <name>', 'profile name to check')
    .action(
      withErrorHandling(async (opts: StatusOptions) => {
        // Resolve profile name
        let profileName = opts.profile;
        const config = await readGlobalConfig();
        if (!profileName) {
          profileName = config.active_profile ?? 'default';
        }

        const profile = config.profiles?.[profileName];

        stderrWrite(`Profile: ${profileName}`);

        if (!profile) {
          stderrWrite(
            `  ${colorError('✗')} No profile found (run 'notion init' to create one)`,
          );
          return;
        }

        // OAuth status
        if (profile.oauth_access_token) {
          const userName = profile.oauth_user_name ?? 'unknown';
          const userId = profile.oauth_user_id ?? 'unknown';
          stderrWrite(
            `  OAuth: ${success('✓')} Logged in as ${userName} (user: ${userId})`,
          );

          if (profile.oauth_expiry_ms != null) {
            const expiryDate = new Date(profile.oauth_expiry_ms).toISOString();
            stderrWrite(dim(`         Access token expires: ${expiryDate}`));
          }
        } else {
          stderrWrite(
            `  OAuth: ${colorError('✗')} Not logged in (run 'notion auth login')`,
          );
        }

        // Internal token status
        if (profile.token) {
          const tokenPreview = `${profile.token.substring(0, 10)}...`;
          stderrWrite(
            `  Internal token: ${success('✓')} Configured (${tokenPreview})`,
          );
        } else {
          stderrWrite(`  Internal token: ${colorError('✗')} Not configured`);
        }

        // Active method
        if (profile.oauth_access_token) {
          stderrWrite(`  Active method: OAuth (user-attributed)`);
        } else if (profile.token) {
          stderrWrite(
            `  Active method: Internal integration token (bot-attributed)`,
          );
        } else {
          stderrWrite(
            dim(
              `  Active method: None (run 'notion auth login' or 'notion init')`,
            ),
          );
        }
      }),
    );

  return cmd;
}
