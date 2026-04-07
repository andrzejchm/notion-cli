import { Command } from 'commander';
import { resolveToken } from '../../config/token.js';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withErrorHandling } from '../../errors/error-handler.js';
import { createNotionClient } from '../../notion/client.js';
import { formatJSON, getOutputMode } from '../../output/format.js';
import { reportTokenSource } from '../../output/stderr.js';
import {
  buildDatabaseUpdatePayload,
  fetchDatabaseSchema,
  resolveDataSourceId,
  updateDatabaseSchema,
} from '../../services/database.service.js';

interface DbUpdateOpts {
  addProp: string[];
  removeProp: string[];
  renameProp: string[];
  setOptions: string[];
  title?: string;
}

function collectProps(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

export function dbUpdateCommand(): Command {
  return new Command('update')
    .description(
      'Update database schema (add/remove/rename properties, manage options)',
    )
    .argument('<id/url>', 'database ID or URL')
    .option(
      '--add-prop <definition>',
      'add property (repeatable): --add-prop "Name:type:options"',
      collectProps,
      [],
    )
    .option(
      '--remove-prop <name>',
      'remove property (repeatable)',
      collectProps,
      [],
    )
    .option(
      '--rename-prop <old:new>',
      'rename property (repeatable): --rename-prop "Old:New"',
      collectProps,
      [],
    )
    .option(
      '--set-options <prop:opts>',
      'set select/multi_select options (repeatable): --set-options "Status:A,B,C"',
      collectProps,
      [],
    )
    .option('--title <title>', 'update database title')
    .action(
      withErrorHandling(async (id: string, opts: DbUpdateOpts) => {
        const hasOperations =
          opts.addProp.length > 0 ||
          opts.removeProp.length > 0 ||
          opts.renameProp.length > 0 ||
          opts.setOptions.length > 0 ||
          opts.title !== undefined;

        if (!hasOperations) {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No update operations specified',
            'Provide at least one of: --add-prop, --remove-prop, --rename-prop, --set-options, --title',
          );
        }

        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const dsId = await resolveDataSourceId(client, id);

        // Fetch schema when rename or set-options operations need it
        const needsSchema =
          opts.renameProp.length > 0 || opts.setOptions.length > 0;
        const schema = needsSchema
          ? await fetchDatabaseSchema(client, dsId)
          : { id: dsId, databaseId: dsId, title: '', properties: {} };

        const payload = buildDatabaseUpdatePayload(
          {
            addProps: opts.addProp,
            removeProps: opts.removeProp,
            renameProps: opts.renameProp,
            setOptions: opts.setOptions,
            title: opts.title,
          },
          schema,
        );

        const response = await updateDatabaseSchema(client, dsId, payload);

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
