import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import {
  isNotionValidationError,
  SELECTOR_HINT,
} from '../errors/notion-errors.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import { replaceMarkdown } from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

interface EditPageOpts {
  message?: string;
  range?: string;
  allowDeletingContent?: boolean;
}

export function editPageCommand(): Command {
  const cmd = new Command('edit-page');

  cmd
    .description(
      "replace a Notion page's content \u2014 full page or a targeted section",
    )
    .argument('<id/url>', 'Notion page ID or URL')
    .option(
      '-m, --message <markdown>',
      'new markdown content for the page body',
    )
    .option(
      '--range <selector>',
      'ellipsis selector to replace only a section, e.g. "## My Section...last line"',
    )
    .option(
      '--allow-deleting-content',
      'allow deletion when using --range (always true for full-page replace)',
    )
    .action(
      withErrorHandling(async (idOrUrl: string, opts: EditPageOpts) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        if (opts.allowDeletingContent && !opts.range) {
          process.stderr.write(
            'Warning: --allow-deleting-content has no effect without --range (full-page replace always allows deletion).\n',
          );
        }

        let markdown = '';
        if (opts.message) {
          markdown = opts.message;
        } else if (!process.stdin.isTTY) {
          // Stricter than `append` — empty content would wipe the page, so we reject it.
          markdown = await readStdin();
          if (!markdown.trim()) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              'No content provided (stdin was empty).',
              'Pass markdown via -m/--message or pipe non-empty content through stdin',
            );
          }
        } else {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No content provided.',
            'Pass markdown via -m/--message or pipe it through stdin',
          );
        }

        const pageId = parseNotionId(idOrUrl);
        const uuid = toUuid(pageId);

        try {
          if (opts.range) {
            await replaceMarkdown(client, uuid, markdown, {
              range: opts.range,
              allowDeletingContent: opts.allowDeletingContent ?? false,
            });
          } else {
            await replaceMarkdown(client, uuid, markdown);
          }
        } catch (error) {
          if (opts.range && isNotionValidationError(error)) {
            // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              `Selector not found: "${opts.range}". ${(error as Error).message}`,
              SELECTOR_HINT,
              error,
            );
          }
          throw error;
        }

        process.stdout.write('Page content replaced.\n');
      }),
    );

  return cmd;
}
