import { Command } from 'commander';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { resolveToken } from '../config/token.js';
import { createNotionClient } from '../notion/client.js';
import { reportTokenSource } from '../output/stderr.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { mdToBlocks } from '../blocks/md-to-blocks.js';
import { appendBlocks } from '../services/write.service.js';

export function appendCommand(): Command {
  const cmd = new Command('append');

  cmd
    .description('append markdown content to a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .requiredOption('-m, --message <markdown>', 'markdown content to append')
    .action(withErrorHandling(async (idOrUrl: string, opts: { message: string }) => {
      const { token, source } = await resolveToken();
      reportTokenSource(source);
      const client = createNotionClient(token);

      const pageId = parseNotionId(idOrUrl);
      const uuid = toUuid(pageId);

      const blocks = mdToBlocks(opts.message);
      if (blocks.length === 0) {
        process.stdout.write('Nothing to append.\n');
        return;
      }

      await appendBlocks(client, uuid, blocks);

      process.stdout.write(`Appended ${blocks.length} block(s).\n`);
    }));

  return cmd;
}
