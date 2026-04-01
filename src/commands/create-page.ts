import { existsSync } from 'node:fs';
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
import {
  buildFileBlock,
  resolveBlockType,
  uploadFile,
} from '../services/upload.service.js';
import { createPage, createPageInDatabase } from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

interface CreatePageOpts {
  parent: string;
  title: string;
  message?: string;
  prop: string[];
  icon?: string;
  cover?: string;
  file: string[];
}

function collectValues(val: string, acc: string[]): string[] {
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
      collectValues,
      [],
    )
    .option('--icon <emoji-or-url>', 'page icon — emoji character or image URL')
    .option('--cover <url>', 'page cover image URL')
    .option(
      '--file <path>',
      'attach a local file to the page after creation (repeatable)',
      collectValues,
      [],
    )
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

        let createdPageUrl: string;

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

          createdPageUrl = await createPageInDatabase(
            client,
            dbSchema.databaseId,
            titlePropName,
            opts.title,
            extraProperties,
            markdown,
            iconCover,
          );
        } else {
          // Page parent
          if (opts.prop.length > 0) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              '--prop is only supported when the parent is a database.',
              'To set properties, use a database ID/URL as --parent',
            );
          }

          createdPageUrl = await createPage(
            client,
            parentUuid,
            opts.title,
            markdown,
            iconCover,
          );
        }

        // Attach files if provided (two-step: page created first, then files appended)
        if (opts.file.length > 0) {
          for (const filePath of opts.file) {
            if (!existsSync(filePath)) {
              throw new CliError(
                ErrorCodes.INVALID_ARG,
                `File not found: ${filePath}`,
                'Provide a valid file path',
              );
            }
          }

          // Parse the created page ID from the URL/ID returned by the API
          const createdPageId = toUuid(parseNotionId(createdPageUrl));

          const blocks = await Promise.all(
            opts.file.map(async (filePath) => {
              const result = await uploadFile(client, filePath);
              const blockType = resolveBlockType(result.contentType);
              return buildFileBlock(result.fileUploadId, blockType);
            }),
          );

          await client.blocks.children.append({
            block_id: createdPageId,
            children: blocks,
          });
        }

        process.stdout.write(`${createdPageUrl}\n`);
      }),
    );

  return cmd;
}
