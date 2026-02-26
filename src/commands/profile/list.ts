import { Command } from 'commander';
import { readGlobalConfig } from '../../config/config.js';
import { bold, dim } from '../../output/color.js';
import { withErrorHandling } from '../../errors/error-handler.js';

export function profileListCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('list all authentication profiles')
    .action(withErrorHandling(async () => {
      const config = await readGlobalConfig();
      const profiles = config.profiles ?? {};
      const profileNames = Object.keys(profiles);

      if (profileNames.length === 0) {
        process.stdout.write('No profiles configured. Run `notion init` to get started.\n');
        return;
      }

      for (const name of profileNames) {
        const profile = profiles[name];
        const isActive = config.active_profile === name;
        const marker = isActive ? bold('* ') : '  ';
        const activeLabel = isActive ? ' (active)' : '';
        const workspaceInfo = profile.workspace_name ? dim(` — ${profile.workspace_name}`) : '';

        process.stdout.write(`${marker}${name}${activeLabel}${workspaceInfo}\n`);
      }
    }));

  return cmd;
}
