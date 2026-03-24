import { Command } from 'commander';
import { resolveToken } from '../../config/token.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { createNotionClient } from '../../notion/client.js';
import { formatJSON, formatTable, getOutputMode } from '../../output/format.js';
import {
  fetchDatabaseSchema,
  resolveDataSourceId,
} from '../../services/database.service.js';

export function dbSchemaCommand(): Command {
  return new Command('schema')
    .description('Show database schema (property names, types, and options)')
    .argument('<id>', 'Notion database ID or URL')
    .action(
      withErrorHandling(async (id: string) => {
        const { token } = await resolveToken();
        const client = createNotionClient(token);
        const dsId = await resolveDataSourceId(client, id);
        const schema = await fetchDatabaseSchema(client, dsId);

        if (getOutputMode() === 'json') {
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
