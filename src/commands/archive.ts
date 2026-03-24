import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';

export function archiveCommand(): Command {
  const cmd = new Command('archive');

  cmd
    .description('archive (trash) a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .action(
      withErrorHandling(async (idOrUrl: string) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const id = parseNotionId(idOrUrl);
        const uuid = toUuid(id);

        const updatedPage = await client.pages.update({
          page_id: uuid,
          archived: true,
        });

        const mode = getOutputMode();
        if (mode === 'json') {
          process.stdout.write(`${formatJSON(updatedPage)}\n`);
        } else {
          process.stdout.write('Page archived.\n');
        }
      }),
    );

  return cmd;
}
