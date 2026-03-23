import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';
import {
  buildPropertiesPayload,
  updatePageProperties,
} from '../services/update.service.js';

interface UpdateOpts {
  prop: string[];
  title?: string;
}

function collectProps(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

export function updateCommand(): Command {
  const cmd = new Command('update');

  cmd
    .description('update properties on a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .option(
      '--prop <property=value>',
      'set a property value (repeatable)',
      collectProps,
      [],
    )
    .option('--title <title>', 'set the page title')
    .action(
      withErrorHandling(async (idOrUrl: string, opts: UpdateOpts) => {
        if (!opts.title && opts.prop.length === 0) {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No properties to update.',
            'Provide at least one --prop "Name=Value" or --title "New Title"',
          );
        }

        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const id = parseNotionId(idOrUrl);
        const uuid = toUuid(id);

        // Fetch the page to get property schema
        const page = (await client.pages.retrieve({
          page_id: uuid,
        })) as PageObjectResponse;

        // Build properties payload from --prop strings
        const properties = buildPropertiesPayload(opts.prop, page);

        // --title is a shortcut that sets the title property
        if (opts.title !== undefined) {
          // Find the title property in the schema
          const titleEntry = Object.entries(page.properties).find(
            ([, prop]) => prop.type === 'title',
          );
          if (!titleEntry) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              'This page has no title property.',
              'Use --prop to set properties by name instead',
            );
          }
          const [titlePropName] = titleEntry;
          properties[titlePropName] = {
            title: [{ type: 'text', text: { content: opts.title } }],
          };
        }

        const updatedPage = await updatePageProperties(
          client,
          uuid,
          properties,
        );

        const mode = getOutputMode();
        if (mode === 'json') {
          process.stdout.write(`${formatJSON(updatedPage)}\n`);
        } else {
          process.stdout.write('Page updated.\n');
        }
      }),
    );

  return cmd;
}
