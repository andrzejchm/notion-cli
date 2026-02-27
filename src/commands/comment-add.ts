import { Command } from 'commander';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { resolveToken } from '../config/token.js';
import { createNotionClient } from '../notion/client.js';
import { reportTokenSource } from '../output/stderr.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { addComment } from '../services/write.service.js';

export function commentAddCommand(): Command {
  const cmd = new Command('comment');

  cmd
    .description('add a comment to a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .requiredOption('-m, --message <text>', 'comment text to post')
    .action(withErrorHandling(async (idOrUrl: string, opts: { message: string }) => {
      const { token, source } = await resolveToken();
      reportTokenSource(source);
      const client = createNotionClient(token);

      const id = parseNotionId(idOrUrl);
      const uuid = toUuid(id);

      await addComment(client, uuid, opts.message, { asUser: source === 'oauth' });

      process.stdout.write('Comment added.\n');
    }));

  return cmd;
}
