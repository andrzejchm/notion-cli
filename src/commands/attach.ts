import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { reportTokenSource } from '../output/stderr.js';
import {
  buildFileBlock,
  resolveBlockType,
  uploadFile,
} from '../services/upload.service.js';

interface AttachOpts {
  caption?: string;
  type?: 'image' | 'file' | 'pdf' | 'audio' | 'video';
  json?: boolean;
}

export function attachCommand(): Command {
  const cmd = new Command('attach');

  cmd
    .description('upload and attach file(s) to a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .argument('<file>', 'file to attach')
    .argument('[files...]', 'additional files to attach')
    .option('--caption <text>', 'caption for the file block(s)')
    .option(
      '--type <type>',
      'override auto-detected block type (image|file|pdf|audio|video)',
    )
    .option('--json', 'output JSON response')
    .action(
      withErrorHandling(
        async (
          idOrUrl: string,
          firstFile: string,
          extraFiles: string[],
          opts: AttachOpts,
        ) => {
          const { token, source } = await resolveToken();
          reportTokenSource(source);
          const client = createNotionClient(token);

          const pageId = toUuid(parseNotionId(idOrUrl));
          const allFiles = [firstFile, ...extraFiles];

          // Validate all files exist before uploading any
          for (const filePath of allFiles) {
            if (!existsSync(filePath)) {
              throw new CliError(
                ErrorCodes.INVALID_ARG,
                `File not found: ${filePath}`,
                'Provide a valid file path',
              );
            }
          }

          // Upload all files and build blocks
          const blocks = await Promise.all(
            allFiles.map(async (filePath) => {
              const result = await uploadFile(client, filePath);
              const blockType =
                opts.type ?? resolveBlockType(result.contentType);
              return buildFileBlock(
                result.fileUploadId,
                blockType,
                opts.caption,
              );
            }),
          );

          // Append all blocks to the page
          const response = await client.blocks.children.append({
            block_id: pageId,
            children: blocks,
          });

          if (opts.json) {
            process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
          } else {
            const pageUrl = `https://www.notion.so/${pageId.replace(/-/g, '')}`;
            process.stdout.write(
              `Attached ${allFiles.length} file(s) to ${pageUrl}\n`,
            );
          }
        },
      ),
    );

  return cmd;
}
