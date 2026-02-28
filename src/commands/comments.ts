import type { CommentObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { printOutput, setOutputMode } from '../output/format.js';
import { paginateResults } from '../output/paginate.js';
import { reportTokenSource } from '../output/stderr.js';

export function commentsCommand(): Command {
  const cmd = new Command('comments');

  cmd
    .description('list comments on a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .option('--json', 'output as JSON')
    .action(
      withErrorHandling(async (idOrUrl: string, opts: { json?: boolean }) => {
        if (opts.json) setOutputMode('json');

        const id = parseNotionId(idOrUrl);
        const uuid = toUuid(id);

        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const notion = createNotionClient(token);

        const comments = (await paginateResults((cursor) =>
          notion.comments.list({ block_id: uuid, start_cursor: cursor }),
        )) as CommentObjectResponse[];

        if (comments.length === 0) {
          process.stdout.write('No comments found on this page\n');
          return;
        }

        const rows = comments.map((comment) => {
          const text = comment.rich_text.map((t) => t.plain_text).join('');
          return [
            comment.created_time.split('T')[0],
            `${comment.created_by.id.slice(0, 8)}...`,
            text.slice(0, 80) + (text.length > 80 ? '…' : ''),
          ];
        });

        printOutput(comments, ['DATE', 'AUTHOR ID', 'COMMENT'], rows);
      }),
    );

  return cmd;
}
