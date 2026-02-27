import { Command } from 'commander';
import { isFullPageOrDataSource } from '@notionhq/client';
import type { PageObjectResponse, DataSourceObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { resolveToken } from '../config/token.js';
import { createNotionClient } from '../notion/client.js';
import { reportTokenSource } from '../output/stderr.js';
import { setOutputMode, printOutput } from '../output/format.js';
import { paginateResults } from '../output/paginate.js';
import { withErrorHandling } from '../errors/error-handler.js';

function getTitle(item: PageObjectResponse | DataSourceObjectResponse): string {
  if (item.object === 'data_source') {
    return item.title.map((t) => t.plain_text).join('') || '(untitled)';
  }
  const titleProp = Object.values(item.properties).find((p) => p.type === 'title');
  if (titleProp?.type === 'title') {
    return titleProp.title.map((t) => t.plain_text).join('') || '(untitled)';
  }
  return '(untitled)';
}

// Display label for object type (data_source shown as "database" to users)
function displayType(item: PageObjectResponse | DataSourceObjectResponse): string {
  return item.object === 'data_source' ? 'database' : item.object;
}

export function lsCommand(): Command {
  const cmd = new Command('ls');

  cmd
    .description('list all accessible Notion pages and databases')
    .option('--type <type>', 'filter by object type (page or database)', (val) => {
      if (val !== 'page' && val !== 'database') {
        throw new Error('--type must be "page" or "database"');
      }
      return val as 'page' | 'database';
    })
    .option('--json', 'force JSON output')
    .action(
      withErrorHandling(async (opts: { type?: 'page' | 'database'; json?: boolean }) => {
        if (opts.json) {
          setOutputMode('json');
        }

        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const notion = createNotionClient(token);

        const results = await paginateResults((cursor) =>
          notion.search({ start_cursor: cursor })
        );

        let items = results.filter((r) => isFullPageOrDataSource(r)) as (
          | PageObjectResponse
          | DataSourceObjectResponse
        )[];

        if (opts.type) {
          const filterType = opts.type;
          items = items.filter((r) =>
            filterType === 'database' ? r.object === 'data_source' : r.object === filterType
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
      })
    );

  return cmd;
}
