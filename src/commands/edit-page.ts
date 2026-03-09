import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import { replaceMarkdown } from '../services/write.service.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

interface EditPageOpts {
  message?: string;
  range?: string;
  allowDeletingContent?: true;
}

function isValidationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code: unknown }).code === 'validation_error'
  );
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

        let markdown = '';
        if (opts.message) {
          markdown = opts.message;
        } else if (!process.stdin.isTTY) {
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

        if (opts.range) {
          try {
            await replaceMarkdown(client, uuid, markdown, {
              range: opts.range,
              allowDeletingContent: opts.allowDeletingContent ?? false,
            });
          } catch (error) {
            if (isValidationError(error)) {
              // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
              throw new CliError(
                ErrorCodes.API_ERROR,
                (error as Error).message,
                'The --range selector must use the ellipsis format: "start text...end text". ' +
                  'Run `notion read <id>` to inspect the page content and find the correct selector.',
                error,
              );
            }
            throw error;
          }
        } else {
          await replaceMarkdown(client, uuid, markdown);
        }

        process.stdout.write('Page content replaced.\n');
      }),
    );

  return cmd;
}
