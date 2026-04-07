import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';

export function deleteBlockCommand(): Command {
  const cmd = new Command('delete-block');

  cmd
    .description('delete a Notion block by ID or URL')
    .argument('<id/url>', 'Notion block ID or URL')
    .action(
      withErrorHandling(async (idOrUrl: string) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const id = parseNotionId(idOrUrl);
        const uuid = toUuid(id);

        const deletedBlock = await client.blocks.delete({ block_id: uuid });

        const mode = getOutputMode();
        if (mode === 'json') {
          process.stdout.write(`${formatJSON(deletedBlock)}\n`);
        } else {
          process.stdout.write('Block deleted.\n');
        }
      }),
    );

  return cmd;
}
