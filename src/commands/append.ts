import type { Client } from '@notionhq/client';
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
import { uploadFilesAsBlocks } from '../services/upload.service.js';
import { appendMarkdown } from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

function collectFiles(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

async function resolveMarkdown(
  message: string | undefined,
  hasFiles: boolean,
): Promise<string> {
  if (message) return message;
  if (!process.stdin.isTTY && !hasFiles) return readStdin();
  if (!hasFiles) {
    throw new CliError(
      ErrorCodes.INVALID_ARG,
      'No content to append.',
      'Pass markdown via -m/--message, pipe it through stdin, or use --file to attach files',
    );
  }
  return '';
}

async function appendMarkdownWithErrorHandling(
  client: Client,
  uuid: string,
  markdown: string,
  after: string | undefined,
): Promise<void> {
  try {
    await appendMarkdown(client, uuid, markdown, after ? { after } : undefined);
  } catch (error) {
    if (after && isNotionValidationError(error)) {
      // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Selector not found: "${after}". ${(error as Error).message}`,
        SELECTOR_HINT,
        error,
      );
    }
    throw error;
  }
}

async function appendFileBlocks(
  client: Client,
  uuid: string,
  filePaths: string[],
): Promise<void> {
  const blocks = await uploadFilesAsBlocks(filePaths, {}, client);

  await client.blocks.children.append({
    block_id: uuid,
    children: blocks,
  });
}

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
    .option(
      '--file <path>',
      'attach a local file to the page (repeatable)',
      collectFiles,
      [],
    )
    .action(
      withErrorHandling(
        async (
          idOrUrl: string,
          opts: { message?: string; after?: string; file: string[] },
        ) => {
          const { token, source } = await resolveToken();
          reportTokenSource(source);
          const client = createNotionClient(token);

          const hasFiles = opts.file.length > 0;
          const markdown = await resolveMarkdown(opts.message, hasFiles);
          const uuid = toUuid(parseNotionId(idOrUrl));

          if (opts.after && !markdown.trim()) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              '--after requires markdown content (-m or stdin)',
              'Provide markdown via -m/--message or pipe it through stdin',
            );
          }

          if (markdown.trim()) {
            await appendMarkdownWithErrorHandling(
              client,
              uuid,
              markdown,
              opts.after,
            );
          }

          if (hasFiles) {
            await appendFileBlocks(client, uuid, opts.file);
          }

          if (hasFiles && markdown.trim()) {
            process.stdout.write(
              `Appended and attached ${opts.file.length} file(s).\n`,
            );
          } else if (hasFiles) {
            process.stdout.write(`Attached ${opts.file.length} file(s).\n`);
          } else {
            process.stdout.write('Appended.\n');
          }
        },
      ),
    );

  return cmd;
}
