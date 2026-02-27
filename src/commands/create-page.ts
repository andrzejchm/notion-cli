import { Command } from 'commander';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { resolveToken } from '../config/token.js';
import { createNotionClient } from '../notion/client.js';
import { reportTokenSource } from '../output/stderr.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { mdToBlocks } from '../blocks/md-to-blocks.js';
import { createPage } from '../services/write.service.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export function createPageCommand(): Command {
  const cmd = new Command('create-page');

  cmd
    .description('create a new Notion page under a parent page')
    .requiredOption('--parent <id/url>', 'parent page ID or URL')
    .requiredOption('--title <title>', 'page title')
    .option('-m, --message <markdown>', 'inline markdown content for the page body')
    .action(withErrorHandling(async (opts: { parent: string; title: string; message?: string }) => {
      const { token, source } = await resolveToken();
      reportTokenSource(source);
      const client = createNotionClient(token);

      let markdown = '';
      if (opts.message) {
        markdown = opts.message;
      } else if (!process.stdin.isTTY) {
        markdown = await readStdin();
      }

      const blocks = mdToBlocks(markdown);
      const parentUuid = toUuid(parseNotionId(opts.parent));
      const url = await createPage(client, parentUuid, opts.title, blocks);

      process.stdout.write(url + '\n');
    }));

  return cmd;
}
