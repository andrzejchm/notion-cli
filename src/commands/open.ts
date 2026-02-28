import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Command } from 'commander';
import { withErrorHandling } from '../errors/error-handler.js';
import { parseNotionId } from '../notion/url-parser.js';

const execAsync = promisify(exec);

export function openCommand(): Command {
  const cmd = new Command('open');

  cmd
    .description('open a Notion page in the default browser')
    .argument('<id/url>', 'Notion page ID or URL')
    .action(
      withErrorHandling(async (idOrUrl: string) => {
        const id = parseNotionId(idOrUrl);
        const url = `https://www.notion.so/${id}`;

        const platform = process.platform;
        const opener =
          platform === 'darwin'
            ? 'open'
            : platform === 'win32'
              ? 'start'
              : 'xdg-open'; // Linux

        await execAsync(`${opener} "${url}"`);
        process.stdout.write(`Opening ${url}\n`);
      }),
    );

  return cmd;
}
