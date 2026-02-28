import { Command } from 'commander';
import { renderPageMarkdown } from '../blocks/render.js';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId } from '../notion/url-parser.js';
import { isatty } from '../output/format.js';
import { renderMarkdown } from '../output/markdown.js';
import { fetchPageWithBlocks } from '../services/page.service.js';

export function readCommand(): Command {
  return new Command('read')
    .description('Read a Notion page as markdown')
    .argument('<id>', 'Notion page ID or URL')
    .option('--json', 'Output raw JSON instead of markdown')
    .option('--md', 'Output raw markdown (no terminal styling)')
    .action(
      withErrorHandling(
        async (id: string, options: { json?: boolean; md?: boolean }) => {
          const { token } = await resolveToken();
          const client = createNotionClient(token);
          const pageId = parseNotionId(id);
          const pageWithBlocks = await fetchPageWithBlocks(client, pageId);

          if (options.json) {
            process.stdout.write(
              `${JSON.stringify(pageWithBlocks, null, 2)}\n`,
            );
          } else {
            const markdown = renderPageMarkdown(pageWithBlocks);
            if (options.md || !isatty()) {
              // Raw markdown — piped output or explicit --md flag
              process.stdout.write(markdown);
            } else {
              // TTY: render with terminal styling, write directly to stdout
              process.stdout.write(renderMarkdown(markdown));
            }
          }
        },
      ),
    );
}
