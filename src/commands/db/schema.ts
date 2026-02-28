import { Command } from 'commander';
import { resolveToken } from '../../config/token.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { createNotionClient } from '../../notion/client.js';
import { parseNotionId } from '../../notion/url-parser.js';
import { formatJSON, formatTable } from '../../output/format.js';
import { fetchDatabaseSchema } from '../../services/database.service.js';

export function dbSchemaCommand(): Command {
  return new Command('schema')
    .description('Show database schema (property names, types, and options)')
    .argument('<id>', 'Notion database ID or URL')
    .option('--json', 'Output raw JSON')
    .action(
      withErrorHandling(async (id: string, options: { json?: boolean }) => {
        const { token } = await resolveToken();
        const client = createNotionClient(token);
        const dbId = parseNotionId(id);
        const schema = await fetchDatabaseSchema(client, dbId);

        if (options.json) {
          process.stdout.write(`${formatJSON(schema)}\n`);
          return;
        }

        // TTY: render as table — one row per property
        const headers = ['PROPERTY', 'TYPE', 'OPTIONS'];
        const rows = Object.values(schema.properties).map((prop) => [
          prop.name,
          prop.type,
          prop.options ? prop.options.map((o) => o.name).join(', ') : '',
        ]);
        process.stdout.write(`${formatTable(rows, headers)}\n`);
      }),
    );
}
