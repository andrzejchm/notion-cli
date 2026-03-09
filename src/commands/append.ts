import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { isNotionValidationError } from '../errors/notion-errors.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import { appendMarkdown } from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

export function appendCommand(): Command {
  const cmd = new Command('append');

  cmd
    .description('append markdown content to a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .option('-m, --message <markdown>', 'markdown content to append')
    .option(
      '--after <selector>',
      'insert after matched content — ellipsis selector, e.g. "## Section...end of section"',
    )
    .action(
      withErrorHandling(
        async (idOrUrl: string, opts: { message?: string; after?: string }) => {
          const { token, source } = await resolveToken();
          reportTokenSource(source);
          const client = createNotionClient(token);

          let markdown = '';
          if (opts.message) {
            markdown = opts.message;
          } else if (!process.stdin.isTTY) {
            markdown = await readStdin();
          } else {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              'No content to append.',
              'Pass markdown via -m/--message or pipe it through stdin',
            );
          }

          if (!markdown.trim()) {
            process.stdout.write('Nothing to append.\n');
            return;
          }

          const pageId = parseNotionId(idOrUrl);
          const uuid = toUuid(pageId);

          try {
            await appendMarkdown(
              client,
              uuid,
              markdown,
              opts.after ? { after: opts.after } : undefined,
            );
          } catch (error) {
            if (opts.after && isNotionValidationError(error)) {
              // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
              throw new CliError(
                ErrorCodes.INVALID_ARG,
                `Selector not found: "${opts.after}". ${(error as Error).message}`,
                'Use an ellipsis selector matching page content, e.g. "## Section...end of section". Run `notion read <id>` to see the page content.',
                error,
              );
            }
            throw error;
          }

          process.stdout.write('Appended.\n');
        },
      ),
    );

  return cmd;
}
