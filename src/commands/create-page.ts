import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import { createPage } from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

export function createPageCommand(): Command {
  const cmd = new Command('create-page');

  cmd
    .description('create a new Notion page under a parent page')
    .requiredOption('--parent <id/url>', 'parent page ID or URL')
    .requiredOption('--title <title>', 'page title')
    .option(
      '-m, --message <markdown>',
      'inline markdown content for the page body',
    )
    .action(
      withErrorHandling(
        async (opts: { parent: string; title: string; message?: string }) => {
          const { token, source } = await resolveToken();
          reportTokenSource(source);
          const client = createNotionClient(token);

          let markdown = '';
          if (opts.message) {
            markdown = opts.message;
          } else if (!process.stdin.isTTY) {
            markdown = await readStdin();
          }

          const parentUuid = toUuid(parseNotionId(opts.parent));
          const url = await createPage(
            client,
            parentUuid,
            opts.title,
            markdown,
          );

          process.stdout.write(`${url}\n`);
        },
      ),
    );

  return cmd;
}
