import { Command } from 'commander';
import { withErrorHandling } from '../../errors/error-handler.js';
import { resolveToken } from '../../config/token.js';
import { createNotionClient } from '../../notion/client.js';
import { parseNotionId } from '../../notion/url-parser.js';
import {
  DatabaseSchema,
  fetchDatabaseSchema,
  queryDatabase,
  buildFilter,
  buildSorts,
} from '../../services/database.service.js';
import { formatTable, formatJSON, isHumanMode } from '../../output/format.js';

// Types that produce poor table output — skip in auto-column selection
const SKIP_TYPES_IN_AUTO = new Set(['relation', 'rich_text', 'people']);

/**
 * Pick columns that fit within the terminal width.
 * - Skips relation/rich_text/people by default (noisy in tables)
 * - Stops adding columns once estimated width would exceed terminal width
 */
function autoSelectColumns(schema: DatabaseSchema, entries: { properties: Record<string, string> }[]): string[] {
  const termWidth = process.stdout.columns || 120;
  const COL_SEP = 2; // two spaces between columns

  // Candidate columns: skip low-value types
  const candidates = Object.values(schema.properties)
    .filter((p) => !SKIP_TYPES_IN_AUTO.has(p.type))
    .map((p) => p.name);

  // Estimate each column's display width (max of header vs data)
  const widths = candidates.map((col) => {
    const header = col.toUpperCase().length;
    const maxData = entries.reduce((max, e) => Math.max(max, (e.properties[col] ?? '').length), 0);
    return Math.min(Math.max(header, maxData), 40); // respect DEFAULT_MAX_COL_WIDTH
  });

  // Greedily add columns until we'd exceed terminal width
  const selected: string[] = [];
  let usedWidth = 0;
  for (let i = 0; i < candidates.length; i++) {
    const needed = (selected.length > 0 ? COL_SEP : 0) + widths[i];
    if (usedWidth + needed > termWidth) break;
    selected.push(candidates[i]);
    usedWidth += needed;
  }

  // Always include at least the first column (title) even if it's wide
  if (selected.length === 0 && candidates.length > 0) {
    selected.push(candidates[0]);
  }

  return selected;
}

export function dbQueryCommand(): Command {
  return new Command('query')
    .description('Query database entries with optional filtering and sorting')
    .argument('<id>', 'Notion database ID or URL')
    .option('--filter <filter>', 'Filter entries (repeatable): --filter "Status=Done"', collect, [])
    .option('--sort <sort>', 'Sort entries (repeatable): --sort "Name:asc"', collect, [])
    .option('--columns <columns>', 'Comma-separated list of columns to display: --columns "Title,Status"')
    .option('--json', 'Output raw JSON')
    .action(
      withErrorHandling(
        async (
          id: string,
          options: { filter: string[]; sort: string[]; columns?: string; json?: boolean },
        ) => {
          const { token } = await resolveToken();
          const client = createNotionClient(token);
          const dbId = parseNotionId(id);

          // Always fetch schema first (needed for filter building + column ordering)
          const schema = await fetchDatabaseSchema(client, dbId);

          const columns = options.columns
            ? options.columns.split(',').map((c) => c.trim())
            : undefined;

          const filter = options.filter.length
            ? buildFilter(options.filter, schema)
            : undefined;

          const sorts = options.sort.length ? buildSorts(options.sort) : undefined;

          const entries = await queryDatabase(client, dbId, { filter, sorts, columns });

          if (options.json || !isHumanMode()) {
            process.stdout.write(formatJSON(entries.map((e) => e.raw)) + '\n');
            return;
          }

          if (entries.length === 0) {
            process.stdout.write('No entries found.\n');
            return;
          }

          // TTY: render as table
          // Use requested columns, or auto-select columns that fit the terminal
          const displayColumns = columns ?? autoSelectColumns(schema, entries);
          const headers = displayColumns.map((c) => c.toUpperCase());
          const rows = entries.map((entry) =>
            displayColumns.map((col) => entry.properties[col] ?? ''),
          );
          process.stdout.write(formatTable(rows, headers) + '\n');
          process.stderr.write(`${entries.length} entries\n`);
        },
      ),
    );
}

// Commander value collector helper for repeatable flags
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
