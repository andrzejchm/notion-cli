import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';

/**
 * Try to archive as a page first. If that fails (e.g. the ID is a database
 * or data source), fall back to trashing via dataSources.update, then
 * databases.update.
 */
async function archiveEntity(
  client: ReturnType<typeof createNotionClient>,
  uuid: string,
): Promise<{ result: unknown; kind: 'page' | 'data_source' | 'database' }> {
  try {
    const result = await client.pages.update({
      page_id: uuid,
      in_trash: true,
    });
    return { result, kind: 'page' };
  } catch {
    // Not a page — try as data source
  }

  try {
    const result = await client.dataSources.update({
      data_source_id: uuid,
      in_trash: true,
    });
    return { result, kind: 'data_source' };
  } catch {
    // Not a data source — try as database
  }

  const result = await client.databases.update({
    database_id: uuid,
    in_trash: true,
  });
  return { result, kind: 'database' };
}

export function archiveCommand(): Command {
  const cmd = new Command('archive');

  cmd
    .description('archive (trash) a Notion page or database')
    .argument('<id/url>', 'Notion page or database ID/URL')
    .action(
      withErrorHandling(async (idOrUrl: string) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const id = parseNotionId(idOrUrl);
        const uuid = toUuid(id);

        const { result, kind } = await archiveEntity(client, uuid);

        const mode = getOutputMode();
        if (mode === 'json') {
          process.stdout.write(`${formatJSON(result)}\n`);
        } else {
          const label = kind === 'page' ? 'Page' : 'Database';
          process.stdout.write(`${label} archived.\n`);
        }
      }),
    );

  return cmd;
}
