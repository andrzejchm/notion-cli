import { Command } from 'commander';
import { input, password, confirm } from '@inquirer/prompts';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { readGlobalConfig, writeGlobalConfig } from '../config/config.js';
import { validateToken, createNotionClient } from '../notion/client.js';
import { stderrWrite } from '../output/stderr.js';
import { success, bold, dim } from '../output/color.js';
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

      // Check if the integration has access to any content
      stderrWrite(dim('Checking integration access...'));
      try {
        const notion = createNotionClient(token);
        const probe = await notion.search({ page_size: 1 });
        if (probe.results.length === 0) {
          stderrWrite('');
          stderrWrite('⚠️  Your integration has no pages connected.');
          stderrWrite('   To grant access, open any Notion page or database:');
          stderrWrite('     1. Click ··· (three dots) in the top-right corner');
          stderrWrite('     2. Select "Connect to"');
          stderrWrite(`     3. Choose "${workspaceName}"`);
          stderrWrite('   Then re-run any notion command to confirm access.');
        } else {
          stderrWrite(success(`✓ Integration has access to content in ${bold(workspaceName)}.`));
        }
      } catch {
        // Non-fatal — don't block init if the probe fails for any reason
        stderrWrite(dim('(Could not verify integration access — run `notion ls` to check)'));
      }
    }));

  return cmd;
}
