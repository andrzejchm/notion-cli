import { Command } from 'commander';
import { resolveToken } from '../../config/token.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { createNotionClient } from '../../notion/client.js';
import { parseNotionId, toUuid } from '../../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../../output/format.js';
import { reportTokenSource } from '../../output/stderr.js';
import {
  createDatabase,
  parsePropertyDefinitions,
} from '../../services/database.service.js';

interface DbCreateOpts {
  parent: string;
  title: string;
  prop: string[];
}

function collectProps(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

export function dbCreateCommand(): Command {
  return new Command('create')
    .description('Create a new database under a parent page')
    .requiredOption('--parent <id/url>', 'parent page ID or URL')
    .requiredOption('--title <title>', 'database title')
    .option(
      '--prop <definition>',
      'property definition (repeatable): --prop "Name:type:options"',
      collectProps,
      [],
    )
    .action(
      withErrorHandling(async (opts: DbCreateOpts) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const parentUuid = toUuid(parseNotionId(opts.parent));
        const properties = parsePropertyDefinitions(opts.prop);

        const response = await createDatabase(
          client,
          parentUuid,
          opts.title,
          properties,
        );

        if (getOutputMode() === 'json') {
          process.stdout.write(`${formatJSON(response)}\n`);
          return;
        }

        if ('url' in response) {
          process.stdout.write(`${response.url}\n`);
        }
      }),
    );
}
