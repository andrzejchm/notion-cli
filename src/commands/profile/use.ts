import { Command } from 'commander';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { readGlobalConfig, writeGlobalConfig } from '../../config/config.js';
import { stderrWrite } from '../../output/stderr.js';
import { success } from '../../output/color.js';
import { withErrorHandling } from '../../errors/error-handler.js';

export function profileUseCommand(): Command {
  const cmd = new Command('use');

  cmd
    .description('switch the active profile')
    .argument('<name>', 'profile name to activate')
    .action(withErrorHandling(async (name: string) => {
      const config = await readGlobalConfig();
      const profiles = config.profiles ?? {};

      if (!profiles[name]) {
        throw new CliError(
          ErrorCodes.AUTH_PROFILE_NOT_FOUND,
          `Profile "${name}" not found.`,
          `Run "notion auth list" to see available profiles`,
        );
      }

      await writeGlobalConfig({
        ...config,
        active_profile: name,
      });

      stderrWrite(success(`Switched to profile "${name}".`));
    }));

  return cmd;
}
