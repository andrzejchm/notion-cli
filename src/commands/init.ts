import { Command } from 'commander';
import { input, password, confirm } from '@inquirer/prompts';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { readGlobalConfig, writeGlobalConfig } from '../config/config.js';
import { validateToken } from '../notion/client.js';
import { stderrWrite } from '../output/stderr.js';
import { success, bold } from '../output/color.js';
import { withErrorHandling } from '../errors/error-handler.js';

export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('authenticate with Notion and save a profile')
    .action(withErrorHandling(async () => {
      // Non-TTY check
      if (!process.stdin.isTTY) {
        throw new CliError(
          ErrorCodes.AUTH_NO_TOKEN,
          'Cannot run interactive init in non-TTY mode.',
          'Set NOTION_API_TOKEN environment variable or create .notion.yaml',
        );
      }

      // Prompt for profile name
      const profileName = await input({
        message: 'Profile name:',
        default: 'default',
      });

      // Prompt for token
      const token = await password({
        message: 'Integration token (from notion.so/profile/integrations/internal):',
        mask: '*',
      });

      stderrWrite('Validating token...');

      // Validate token
      const { workspaceName, workspaceId } = await validateToken(token);

      stderrWrite(success(`✓ Connected to workspace: ${bold(workspaceName)}`));

      // Read existing config
      const config = await readGlobalConfig();

      // Check for existing profile
      if (config.profiles?.[profileName]) {
        const replace = await confirm({
          message: `Profile "${profileName}" already exists. Replace?`,
          default: false,
        });
        if (!replace) {
          stderrWrite('Aborted.');
          return;
        }
      }

      // Save profile
      const profiles = config.profiles ?? {};
      profiles[profileName] = {
        token,
        workspace_name: workspaceName,
        workspace_id: workspaceId,
      };

      await writeGlobalConfig({
        ...config,
        profiles,
        active_profile: profileName,
      });

      stderrWrite(success(`Profile "${profileName}" saved and set as active.`));
    }));

  return cmd;
}
