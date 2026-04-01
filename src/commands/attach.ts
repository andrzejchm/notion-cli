import { Command, Option } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { parseNotionId, toUuid } from '../notion/url-parser.js';
import { formatJSON, getOutputMode } from '../output/format.js';
import { reportTokenSource } from '../output/stderr.js';
import { uploadFilesAsBlocks } from '../services/upload.service.js';

interface AttachOpts {
  caption?: string;
  type?: 'image' | 'file' | 'pdf' | 'audio' | 'video';
}

export function attachCommand(): Command {
  const cmd = new Command('attach');

  cmd
    .description('upload and attach file(s) to a Notion page')
    .argument('<id/url>', 'Notion page ID or URL')
    .argument('<file>', 'file to attach')
    .argument('[files...]', 'additional files to attach')
    .option('--caption <text>', 'caption for the file block(s)')
    .addOption(
      new Option(
        '--type <type>',
        'override auto-detected block type (image|file|pdf|audio|video)',
      ).choices(['image', 'file', 'pdf', 'audio', 'video']),
    )
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

          // Upload all files and build blocks (validation happens inside)
          const blocks = await uploadFilesAsBlocks(
            allFiles,
            { caption: opts.caption, type: opts.type },
            client,
          );

          // Append all blocks to the page
          const response = await client.blocks.children.append({
            block_id: pageId,
            children: blocks,
          });

          const mode = getOutputMode();
          if (mode === 'json') {
            process.stdout.write(`${formatJSON(response)}\n`);
          } else {
            const pageUrl = `https://www.notion.so/${parseNotionId(idOrUrl)}`;
            process.stdout.write(
              `Attached ${allFiles.length} file(s) to ${pageUrl}\n`,
            );
          }
        },
      ),
    );

  return cmd;
}
