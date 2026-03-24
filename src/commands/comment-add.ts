import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import { addComment, type CommentTarget } from '../services/write.service.js';

interface CommentOpts {
  message: string;
  replyTo?: string;
  block?: string;
}

function resolveTarget(
  idOrUrl: string | undefined,
  opts: CommentOpts,
): CommentTarget {
  const targetCount = [idOrUrl, opts.replyTo, opts.block].filter(
    Boolean,
  ).length;
  if (targetCount > 1) {
    throw new CliError(
      ErrorCodes.INVALID_ARG,
      'Provide only one target: a page ID/URL, --reply-to, or --block.',
      'These options are mutually exclusive',
    );
  }
  if (opts.replyTo) {
    return { type: 'reply', discussionId: opts.replyTo };
  }
  if (opts.block) {
    return { type: 'block', blockId: opts.block };
  }
  if (idOrUrl) {
    const id = parseNotionId(idOrUrl);
    return { type: 'page', pageId: toUuid(id) };
  }
  throw new CliError(
    ErrorCodes.INVALID_ARG,
    'Provide a page ID/URL, --reply-to <discussion-id>, or --block <block-id>.',
  );
}

export function commentAddCommand(): Command {
  const cmd = new Command('comment');

  cmd
    .description('add a comment to a Notion page, block, or discussion thread')
    .argument('[id/url]', 'Notion page ID or URL')
    .requiredOption('-m, --message <text>', 'comment text to post')
    .option(
      '--reply-to <discussion-id>',
      'reply to an existing discussion thread',
    )
    .option('--block <block-id>', 'comment on a specific block')
    .action(
      withErrorHandling(
        async (idOrUrl: string | undefined, opts: CommentOpts) => {
          const target = resolveTarget(idOrUrl, opts);

          const { token, source } = await resolveToken();
          reportTokenSource(source);
          const client = createNotionClient(token);

          await addComment(client, target, opts.message, {
            asUser: source === 'oauth',
          });

          process.stdout.write('Comment added.\n');
        },
      ),
    );

  return cmd;
}
