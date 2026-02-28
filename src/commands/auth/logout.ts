import { select } from '@inquirer/prompts';
import { Command } from 'commander';
import { readGlobalConfig, writeGlobalConfig } from '../../config/config.js';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { bold, dim, success } from '../../output/color.js';
import { stderrWrite } from '../../output/stderr.js';

interface LogoutOptions {
  profile?: string;
}

function profileLabel(
  name: string,
  profile: {
    token?: string;
    oauth_access_token?: string;
    oauth_user_name?: string;
    workspace_name?: string;
  },
): string {
  const parts: string[] = [];
  if (profile.oauth_access_token)
    parts.push(
      `OAuth${profile.oauth_user_name ? ` (${profile.oauth_user_name})` : ''}`,
    );
  if (profile.token) parts.push('integration token');
  const authDesc = parts.length > 0 ? parts.join(' + ') : 'no credentials';
  const workspace = profile.workspace_name
    ? dim(` — ${profile.workspace_name}`)
    : '';
  return `${bold(name)}  ${dim(authDesc)}${workspace}`;
}

export function logoutCommand(): Command {
  const cmd = new Command('logout');

  cmd
    .description('remove a profile and its credentials')
    .option(
      '--profile <name>',
      'profile name to remove (skips interactive selector)',
    )
    .action(
      withErrorHandling(async (opts: LogoutOptions) => {
        const config = await readGlobalConfig();
        const profiles = config.profiles ?? {};
        const profileNames = Object.keys(profiles);

        if (profileNames.length === 0) {
          stderrWrite('No profiles configured.');
          return;
        }

        let profileName = opts.profile;

        if (!profileName) {
          if (!process.stdin.isTTY) {
            throw new CliError(
              ErrorCodes.AUTH_NO_TOKEN,
              'Cannot run interactive logout in non-TTY mode.',
              'Use --profile <name> to specify the profile to remove',
            );
          }

          profileName = await select({
            message: 'Which profile do you want to log out of?',
            choices: profileNames.map((name) => ({
              // biome-ignore lint/style/noNonNullAssertion: key is from Object.keys, always present
              name: profileLabel(name, profiles[name]!),
              value: name,
            })),
          });
        }

        if (!profiles[profileName]) {
          throw new CliError(
            ErrorCodes.AUTH_PROFILE_NOT_FOUND,
            `Profile "${profileName}" not found.`,
            `Run "notion auth list" to see available profiles`,
          );
        }

        const updatedProfiles = { ...profiles };
        delete updatedProfiles[profileName];

        const newActiveProfile =
          config.active_profile === profileName
            ? undefined
            : config.active_profile;

        await writeGlobalConfig({
          ...config,
          profiles: updatedProfiles,
          active_profile: newActiveProfile,
        });

        stderrWrite(success(`✓ Logged out of profile "${profileName}".`));
        if (
          newActiveProfile === undefined &&
          Object.keys(updatedProfiles).length > 0
        ) {
          stderrWrite(
            dim(`Run "notion auth use <name>" to set a new active profile.`),
          );
        }
      }),
    );

  return cmd;
}
