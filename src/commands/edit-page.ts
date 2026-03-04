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

export function editPageCommand(): Command {
  const cmd = new Command('edit-page');

  cmd
    .description(
      'replace the entire content of a Notion page with new markdown',
    )
    .argument('<id/url>', 'Notion page ID or URL')
    .option(
      '-m, --message <markdown>',
      'new markdown content for the page body',
    )
    .action(
      withErrorHandling(async (idOrUrl: string, opts: { message?: string }) => {
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

        await replaceMarkdown(client, uuid, markdown);

        process.stdout.write('Page content replaced.\n');
      }),
    );

  return cmd;
}
