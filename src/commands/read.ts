import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId } from '../notion/url-parser.js';
import { getOutputMode, isatty } from '../output/format.js';
import { renderMarkdown } from '../output/markdown.js';
import { fetchPageMarkdown } from '../services/page.service.js';

export function readCommand(): Command {
  return (
    new Command('read')
      .description('Read a Notion page as markdown')
      .argument('<id>', 'Notion page ID or URL')
      // Note: --json and --md are inherited from the root program global options.
      // Do NOT redefine them here — Commander routes them to the root program,
      // which sets the output mode via the preAction hook. Read them via getOutputMode().
      .action(
        withErrorHandling(async (id: string) => {
          const { token } = await resolveToken();
          const client = createNotionClient(token);
          const pageId = parseNotionId(id);
          const pageWithMarkdown = await fetchPageMarkdown(client, pageId);

          const mode = getOutputMode();
          if (mode === 'json') {
            process.stdout.write(
              `${JSON.stringify(pageWithMarkdown, null, 2)}\n`,
            );
          } else {
            const { markdown } = pageWithMarkdown;
            if (mode === 'md' || !isatty()) {
              // Raw markdown — piped output or explicit --md flag
              process.stdout.write(markdown);
            } else {
              // TTY: render with terminal styling
              process.stdout.write(renderMarkdown(markdown));
            }
          }
        }),
      )
  );
}
