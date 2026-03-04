import type { Client } from '@notionhq/client';

export async function addComment(
  client: Client,
  pageId: string,
  text: string,
  options: { asUser?: boolean } = {},
): Promise<void> {
  await client.comments.create({
    parent: { page_id: pageId },
    rich_text: [
      {
        type: 'text',
        text: { content: text, link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
      },
    ],
    ...(options.asUser && { display_name: { type: 'user' } }),
  });
}

/**
 * Appends markdown content to an existing Notion page using the native
 * PATCH /v1/pages/:id/markdown endpoint (insert_content mode).
 */
export async function appendMarkdown(
  client: Client,
  pageId: string,
  markdown: string,
): Promise<void> {
  await client.pages.updateMarkdown({
    page_id: pageId,
    type: 'insert_content',
    insert_content: { content: markdown },
  });
}

/**
 * Returns the number of non-overlapping occurrences of `sub` in `text`.
 */
function countOccurrences(text: string, sub: string): number {
  let count = 0;
  let pos = text.indexOf(sub, 0);
  while (pos !== -1) {
    count++;
    pos = text.indexOf(sub, pos + 1);
  }
  return count;
}

/**
 * Builds a "start...end" content_range selector that uniquely identifies the
 * entire content of the page. Grows the end snippet until it appears exactly
 * once in the text, to avoid ambiguity with repeated structural elements
 * (e.g. multiple identical tables).
 */
function buildContentRange(content: string): string {
  const START_LEN = 15;
  const STEP = 10;

  if (content.length <= START_LEN * 2) {
    return content;
  }

  const start = content.slice(0, START_LEN);

  for (
    let endLen = START_LEN;
    endLen < content.length - START_LEN;
    endLen += STEP
  ) {
    const end = content.slice(-endLen);
    if (countOccurrences(content, end) === 1) {
      return `${start}...${end}`;
    }
  }

  // Entire content is used as the range as a last resort
  return content;
}

/**
 * Replaces the entire content of a Notion page with the given markdown.
 *
 * replace_content_range requires a content_range selector, so we first fetch
 * the current markdown to build a selector that spans the full document.
 * If the page is empty we fall back to insert_content instead.
 */
export async function replaceMarkdown(
  client: Client,
  pageId: string,
  newMarkdown: string,
): Promise<void> {
  const current = await client.pages.retrieveMarkdown({ page_id: pageId });
  const currentContent = current.markdown.trim();

  if (!currentContent) {
    // Empty page — just insert
    if (newMarkdown.trim()) {
      await client.pages.updateMarkdown({
        page_id: pageId,
        type: 'insert_content',
        insert_content: { content: newMarkdown },
      });
    }
    return;
  }

  await client.pages.updateMarkdown({
    page_id: pageId,
    type: 'replace_content_range',
    replace_content_range: {
      content: newMarkdown,
      content_range: buildContentRange(currentContent),
      allow_deleting_content: true,
    },
  });
}

/**
 * Creates a new Notion page under a parent page with the given markdown content.
 *
 * Uses the native POST /v1/pages `markdown` field (server-side parsing).
 */
export async function createPage(
  client: Client,
  parentId: string,
  title: string,
  markdown: string,
): Promise<string> {
  const response = await client.pages.create({
    parent: { type: 'page_id', page_id: parentId },
    properties: {
      title: {
        title: [{ type: 'text', text: { content: title, link: null } }],
      },
    },
    ...(markdown.trim() ? { markdown } : {}),
  });
  return (response as { url: string }).url;
}
