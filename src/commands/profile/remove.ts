import { Command } from 'commander';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { readGlobalConfig, writeGlobalConfig } from '../../config/config.js';
import { stderrWrite } from '../../output/stderr.js';
import { success } from '../../output/color.js';
import { withErrorHandling } from '../../errors/error-handler.js';

export function profileRemoveCommand(): Command {
  const cmd = new Command('remove');

  cmd
    .description('remove an authentication profile')
    .argument('<name>', 'profile name to remove')
    .action(withErrorHandling(async (name: string) => {
      const config = await readGlobalConfig();
      const profiles = { ...(config.profiles ?? {}) };

      if (!profiles[name]) {
        throw new CliError(
          ErrorCodes.AUTH_PROFILE_NOT_FOUND,
          `Profile "${name}" not found.`,
          `Run "notion auth list" to see available profiles`,
        );
      }

      delete profiles[name];

      // Unset active_profile if it was the removed profile
      const newActiveProfile =
        config.active_profile === name ? undefined : config.active_profile;

      await writeGlobalConfig({
        ...config,
        profiles,
        active_profile: newActiveProfile,
      });

      stderrWrite(success(`Profile "${name}" removed.`));
    }));

  return cmd;
}
