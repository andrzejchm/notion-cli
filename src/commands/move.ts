import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';
import { resolveDataSourceId } from '../services/database.service.js';

interface MoveOpts {
  to?: string;
  toDb?: string;
}

export function moveCommand(): Command {
  const cmd = new Command('move');

  cmd
    .description('move pages to a new parent')
    .argument('<ids/urls...>', 'Notion page IDs or URLs to move')
    .option('--to <id/url>', 'target page parent ID or URL')
    .option(
      '--to-db <id/url>',
      'target database parent ID or URL (resolves to data source)',
    )
    .action(
      withErrorHandling(async (idsOrUrls: string[], opts: MoveOpts) => {
        if (!opts.to && !opts.toDb) {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No target parent specified.',
            'Provide --to <page-id> or --to-db <database-id>',
          );
        }

        if (opts.to && opts.toDb) {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'Cannot specify both --to and --to-db.',
            'Provide only one: --to <page-id> or --to-db <database-id>',
          );
        }

        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        let parent:
          | { type: 'page_id'; page_id: string }
          | { type: 'data_source_id'; data_source_id: string };

        if (opts.toDb) {
          const dsId = await resolveDataSourceId(client, opts.toDb);
          parent = { type: 'data_source_id', data_source_id: dsId };
        } else if (opts.to) {
          const targetId = toUuid(parseNotionId(opts.to));
          parent = { type: 'page_id', page_id: targetId };
        } else {
          // Unreachable — validated above
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No target parent specified.',
          );
        }

        const results = [];
        for (const idOrUrl of idsOrUrls) {
          const uuid = toUuid(parseNotionId(idOrUrl));
          const result = await client.pages.move({ page_id: uuid, parent });
          results.push(result);
        }

        const mode = getOutputMode();
        if (mode === 'json') {
          process.stdout.write(`${formatJSON(results)}\n`);
        } else {
          process.stdout.write(`Moved ${results.length} page(s).\n`);
        }
      }),
    );

  return cmd;
}
