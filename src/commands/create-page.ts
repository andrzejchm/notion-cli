import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import { fetchDatabaseSchema } from '../services/database.service.js';
import { buildPropertiesPayload } from '../services/update.service.js';
import { createPage, createPageInDatabase } from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

interface CreatePageOpts {
  parent: string;
  title: string;
  message?: string;
  prop: string[];
  icon?: string;
  cover?: string;
}

function collectProps(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

/**
 * Determines whether a Notion ID refers to a database by attempting to
 * retrieve it as a data source. Returns the schema if it is a database,
 * or null if it is not.
 */
async function tryGetDatabaseSchema(
  client: ReturnType<typeof createNotionClient>,
  uuid: string,
) {
  try {
    return await fetchDatabaseSchema(client, uuid);
  } catch {
    return null;
  }
}

export function createPageCommand(): Command {
  const cmd = new Command('create-page');

  cmd
    .description('create a new Notion page under a parent page or database')
    .requiredOption('--parent <id/url>', 'parent page or database ID/URL')
    .requiredOption('--title <title>', 'page title')
    .option(
      '-m, --message <markdown>',
      'inline markdown content for the page body',
    )
    .option(
      '--prop <property=value>',
      'set a property value (repeatable, database parents only)',
      collectProps,
      [],
    )
    .option('--icon <emoji-or-url>', 'page icon — emoji character or image URL')
    .option('--cover <url>', 'page cover image URL')
    .action(
      withErrorHandling(async (opts: CreatePageOpts) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        let markdown = '';
        if (opts.message) {
          markdown = opts.message;
        } else if (!process.stdin.isTTY) {
          markdown = await readStdin();
        }

        const parentUuid = toUuid(parseNotionId(opts.parent));
        const iconCover = { icon: opts.icon, cover: opts.cover };

        // Try to resolve as a database first
        const dbSchema = await tryGetDatabaseSchema(client, parentUuid);

        if (dbSchema) {
          // Database parent — find the title property name
          const titleEntry = Object.entries(dbSchema.properties).find(
            ([, prop]) => prop.type === 'title',
          );
          if (!titleEntry) {
            throw new CliError(
              ErrorCodes.API_ERROR,
              'Database has no title property.',
              'This database cannot accept new pages.',
            );
          }
          const [titlePropName] = titleEntry;

          // Build extra properties from --prop flags
          const extraProperties =
            opts.prop.length > 0
              ? buildPropertiesPayload(opts.prop, dbSchema.properties)
              : {};

          const url = await createPageInDatabase(
            client,
            parentUuid,
            titlePropName,
            opts.title,
            extraProperties,
            markdown,
            iconCover,
          );
          process.stdout.write(`${url}\n`);
        } else {
          // Page parent
          if (opts.prop.length > 0) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              '--prop is only supported when the parent is a database.',
              'To set properties, use a database ID/URL as --parent',
            );
          }

          const url = await createPage(
            client,
            parentUuid,
            opts.title,
            markdown,
            iconCover,
          );
          process.stdout.write(`${url}\n`);
        }
      }),
    );

  return cmd;
}
