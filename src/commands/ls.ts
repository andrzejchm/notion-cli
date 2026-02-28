import { isFullPageOrDataSource } from '@notionhq/client';
import type {
  DataSourceObjectResponse,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { printOutput, setOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';

function getTitle(item: PageObjectResponse | DataSourceObjectResponse): string {
  if (item.object === 'data_source') {
    return item.title.map((t) => t.plain_text).join('') || '(untitled)';
  }
  const titleProp = Object.values(item.properties).find(
    (p) => p.type === 'title',
  );
  if (titleProp?.type === 'title') {
    return titleProp.title.map((t) => t.plain_text).join('') || '(untitled)';
  }
  return '(untitled)';
}

// Display label for object type (data_source shown as "database" to users)
function displayType(
  item: PageObjectResponse | DataSourceObjectResponse,
): string {
  return item.object === 'data_source' ? 'database' : item.object;
}

export function lsCommand(): Command {
  const cmd = new Command('ls');

  cmd
    .description('list accessible Notion pages and databases')
    .option(
      '--type <type>',
      'filter by object type (page or database)',
      (val) => {
        if (val !== 'page' && val !== 'database') {
          throw new Error('--type must be "page" or "database"');
        }
        return val as 'page' | 'database';
      },
    )
    .option(
      '--cursor <cursor>',
      'start from this pagination cursor (from a previous --next hint)',
    )
    .option('--json', 'force JSON output')
    .action(
      withErrorHandling(
        async (opts: {
          type?: 'page' | 'database';
          cursor?: string;
          json?: boolean;
        }) => {
          if (opts.json) {
            setOutputMode('json');
          }

          const { token, source } = await resolveToken();
          reportTokenSource(source);
          const notion = createNotionClient(token);

          const response = await notion.search({
            start_cursor: opts.cursor,
            page_size: 20,
          });

          let items = response.results.filter((r) =>
            isFullPageOrDataSource(r),
          ) as (PageObjectResponse | DataSourceObjectResponse)[];

          if (opts.type) {
            const filterType = opts.type;
            items = items.filter((r) =>
              filterType === 'database'
                ? r.object === 'data_source'
                : r.object === filterType,
            );
          }

          if (items.length === 0) {
            process.stdout.write('No accessible content found\n');
            return;
          }

          const headers = ['TYPE', 'TITLE', 'ID', 'MODIFIED'];
          const rows = items.map((item) => [
            displayType(item),
            getTitle(item),
            item.id,
            item.last_edited_time.split('T')[0],
          ]);

          printOutput(items, headers, rows);

          if (response.has_more && response.next_cursor) {
            process.stderr.write(
              `\n  --next: notion ls --cursor ${response.next_cursor}\n`,
            );
          }
        },
      ),
    );

  return cmd;
}
