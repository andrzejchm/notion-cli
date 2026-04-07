import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { toUuid } from '../notion/url-parser.js';

export interface PageWithMarkdown {
  page: PageObjectResponse;
  markdown: string;
}

/** Regex matching `<unknown url="..." alt="bookmark"/>` tags emitted by the Notion API */
const UNKNOWN_BOOKMARK_REGEX = /<unknown url="([^"]*)" alt="bookmark"\/>/g;

/** Extracts a 32-char hex block ID from the fragment of a Notion block URL */
function extractBlockIdFromUrl(url: string): string | null {
  const fragment = new URL(url).hash.slice(1); // strip leading '#'
  const hex = fragment.replace(/-/g, '');
  return /^[0-9a-f]{32}$/i.test(hex) ? hex : null;
}

/** Converts a rich-text array to a plain-text string */
function richTextToPlainText(richText: Array<{ plain_text?: string }>): string {
  return richText.map((rt) => rt.plain_text ?? '').join('');
}

/**
 * Scans `markdown` for `<unknown ... alt="bookmark"/>` tags, fetches the
 * actual bookmark URL from the Notion Blocks API, and replaces each tag with
 * a proper markdown link `[caption](url)` (or just the URL when there is no
 * caption).  Tags that cannot be resolved are left unchanged.
 */
export async function resolveUnknownBookmarks(
  client: Client,
  markdown: string,
): Promise<string> {
  const matches = [...markdown.matchAll(UNKNOWN_BOOKMARK_REGEX)];
  if (matches.length === 0) return markdown;

  // Deduplicate block IDs so we don't fetch the same block twice
  const tagToBlockId = new Map<string, string | null>();
  for (const match of matches) {
    const tag = match[0];
    if (tagToBlockId.has(tag)) continue;
    try {
      const blockId = extractBlockIdFromUrl(match[1]);
      tagToBlockId.set(tag, blockId);
    } catch {
      tagToBlockId.set(tag, null);
    }
  }

  // Fetch all unique blocks in parallel
  const blockIdToReplacement = new Map<string, string>();
  await Promise.all(
    [...new Set(tagToBlockId.values())].map(async (blockId) => {
      if (!blockId) return;
      try {
        const block = (await client.blocks.retrieve({
          block_id: toUuid(blockId),
        })) as {
          type?: string;
          bookmark?: {
            url: string;
            caption: Array<{ plain_text?: string }>;
          };
        };

        if (block.type !== 'bookmark' || !block.bookmark) return;

        const { url, caption } = block.bookmark;
        const captionText = richTextToPlainText(caption).trim();
        const replacement = captionText ? `[${captionText}](${url})` : url;
        blockIdToReplacement.set(blockId, replacement);
      } catch {
        // Leave the original tag if block retrieval fails
      }
    }),
  );

  // Replace each tag with its resolved markdown (or leave unchanged)
  return markdown.replace(UNKNOWN_BOOKMARK_REGEX, (tag, notionUrl) => {
    try {
      const blockId = extractBlockIdFromUrl(notionUrl);
      if (!blockId) return tag;
      return blockIdToReplacement.get(blockId) ?? tag;
    } catch {
      return tag;
    }
  });
}

/**
 * Fetches a page's metadata and its content as markdown using the native
 * Notion markdown endpoint (GET /v1/pages/:id/markdown).
 */
export async function fetchPageMarkdown(
  client: Client,
  pageId: string,
): Promise<PageWithMarkdown> {
  const [page, markdownResponse] = await Promise.all([
    client.pages.retrieve({ page_id: pageId }) as Promise<PageObjectResponse>,
    client.pages.retrieveMarkdown({ page_id: pageId }),
  ]);

  const markdown = await resolveUnknownBookmarks(
    client,
    markdownResponse.markdown,
  );

  return { page, markdown };
}
