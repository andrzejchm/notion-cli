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
import {
  replaceMarkdown,
  replacePageContent,
  searchAndReplace,
} from '../services/write.service.js';
import { readStdin } from '../utils/stdin.js';

function collect(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

interface EditPageOpts {
  message?: string;
  find: string[];
  replace: string[];
  all?: boolean;
  range?: string;
  allowDeletingContent?: boolean;
}

export function editPageCommand(): Command {
  const cmd = new Command('edit-page');

  cmd
    .description(
      "replace a Notion page's content — full page or a targeted section",
    )
    .argument('<id/url>', 'Notion page ID or URL')
    .option(
      '-m, --message <markdown>',
      'new markdown content for the page body',
    )
    .option(
      '--find <text>',
      'text to find (repeatable, pair with --replace)',
      collect,
      [],
    )
    .option(
      '--replace <text>',
      'replacement text (repeatable, pair with --find)',
      collect,
      [],
    )
    .option('--all', 'replace all matches of each --find pattern')
    .option(
      '--range <selector>',
      '[deprecated] ellipsis selector to replace only a section, e.g. "## My Section...last line"',
    )
    .option(
      '--allow-deleting-content',
      'allow deletion of child pages/databases',
    )
    .action(
      withErrorHandling(async (idOrUrl: string, opts: EditPageOpts) => {
        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const client = createNotionClient(token);

        const pageId = parseNotionId(idOrUrl);
        const uuid = toUuid(pageId);

        // Path 1: search-and-replace via --find/--replace
        if (opts.find.length > 0) {
          if (opts.find.length !== opts.replace.length) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              `Mismatched --find/--replace: got ${opts.find.length} --find and ${opts.replace.length} --replace flags.`,
              'Provide the same number of --find and --replace flags, paired by position.',
            );
          }

          const updates = opts.find.map((oldStr, i) => ({
            oldStr,
            newStr: opts.replace[i],
          }));

          await searchAndReplace(client, uuid, updates, {
            replaceAll: opts.all ?? false,
            allowDeletingContent: opts.allowDeletingContent ?? false,
          });

          process.stdout.write('Page content updated.\n');
          return;
        }

        // Resolve markdown content from -m or stdin
        let markdown = '';
        if (opts.message) {
          markdown = opts.message;
        } else if (!process.stdin.isTTY) {
          markdown = await readStdin();
          if (!markdown.trim()) {
            throw new CliError(
              ErrorCodes.INVALID_ARG,
              'No content provided (stdin was empty).',
              'Pass content via -m/--message for full replacement, --find/--replace for targeted edits, or pipe content through stdin',
            );
          }
        } else {
          throw new CliError(
            ErrorCodes.INVALID_ARG,
            'No content provided.',
            'Pass content via -m/--message for full replacement, --find/--replace for targeted edits, or pipe content through stdin',
          );
        }

        // Path 2: deprecated --range (legacy replace_content_range)
        if (opts.range) {
          try {
            await replaceMarkdown(client, uuid, markdown, {
              range: opts.range,
              allowDeletingContent: opts.allowDeletingContent ?? false,
            });
          } catch (error) {
            if (isNotionValidationError(error)) {
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
          return;
        }

        // Path 3: full-page replace via replace_content
        await replacePageContent(client, uuid, markdown, {
          allowDeletingContent: opts.allowDeletingContent ?? false,
        });

        process.stdout.write('Page content replaced.\n');
      }),
    );

  return cmd;
}
