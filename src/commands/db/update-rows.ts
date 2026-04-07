import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { Command } from 'commander';
import { resolveToken } from '../../config/token.js';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { createNotionClient } from '../../notion/client.js';
import { formatJSON, getOutputMode } from '../../output/format.js';
import {
  buildFilter,
  fetchDatabaseSchema,
  queryDatabase,
  resolveDataSourceId,
} from '../../services/database.service.js';
import {
  buildPropertiesPayload,
  updatePageProperties,
} from '../../services/update.service.js';

const LARGE_BATCH_WARNING_THRESHOLD = 10;
const DEFAULT_CONCURRENCY = 3;

interface UpdateRowsOpts {
  filter: string[];
  prop: string[];
  dryRun: boolean;
}

interface UpdateRowResult {
  id: string;
  title: string;
  success: boolean;
  error?: string;
}

function collectProps(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

async function batchUpdate<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

function getPageTitle(page: PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title') {
      return prop.title.map((r) => r.plain_text).join('') || page.id;
    }
  }
  return page.id;
}

export function dbUpdateRowsCommand(): Command {
  return new Command('update-rows')
    .description('Update properties on all matching rows in a database')
    .argument('<id>', 'Notion database ID or URL')
    .option(
      '--filter <filter>',
      'Filter rows (repeatable): --filter "Status=Done"',
      collectProps,
      [],
    )
    .option(
      '--prop <property=value>',
      'Set a property value on matching rows (repeatable, required)',
      collectProps,
      [],
    )
    .option('--dry-run', 'Preview matching rows without making changes', false)
    .action(
      withErrorHandling(async (id: string, opts: UpdateRowsOpts) => {
        if (opts.prop.length === 0) {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No properties to update.',
            'Provide at least one --prop "Name=Value"',
          );
        }

        const { token } = await resolveToken();
        const client = createNotionClient(token);
        const dsId = await resolveDataSourceId(client, id);
        const schema = await fetchDatabaseSchema(client, dsId);

        const filter = opts.filter.length
          ? buildFilter(opts.filter, schema)
          : undefined;

        const entries = await queryDatabase(client, dsId, { filter });

        if (
          opts.filter.length === 0 &&
          entries.length > LARGE_BATCH_WARNING_THRESHOLD
        ) {
          process.stderr.write(
            `Warning: no --filter specified — ${entries.length} rows will be updated.\n`,
          );
        }

        if (opts.dryRun) {
          process.stderr.write(
            `Dry run: would update ${entries.length} row(s).\n`,
          );
          const lines = entries
            .map((e) => `${e.id}\t${getPageTitle(e.raw)}`)
            .join('\n');
          if (entries.length > 0) {
            process.stdout.write(`${lines}\n`);
          }
          return;
        }

        const results = await batchUpdate<
          (typeof entries)[number],
          UpdateRowResult
        >(entries, async (entry) => {
          const title = getPageTitle(entry.raw);
          try {
            const properties = buildPropertiesPayload(
              opts.prop,
              entry.raw as PageObjectResponse,
            );
            await updatePageProperties(client, entry.id, properties);
            return { id: entry.id, title, success: true };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { id: entry.id, title, success: false, error: message };
          }
        });

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.length - successCount;

        if (getOutputMode() === 'json') {
          process.stdout.write(`${formatJSON(results)}\n`);
          return;
        }

        process.stdout.write(`Updated ${successCount} row(s).\n`);
        if (failureCount > 0) {
          process.stderr.write(`${failureCount} row(s) failed to update.\n`);
          for (const r of results.filter((res) => !res.success)) {
            process.stderr.write(`  ${r.id} (${r.title}): ${r.error}\n`);
          }
        }
      }),
    );
}
