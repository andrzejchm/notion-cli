import type { Client } from '@notionhq/client';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints.js';

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

export async function appendBlocks(
  client: Client,
  blockId: string,
  blocks: BlockObjectRequest[],
): Promise<void> {
  await client.blocks.children.append({
    block_id: blockId,
    children: blocks,
  });
}

export async function createPage(
  client: Client,
  parentId: string,
  title: string,
  blocks: BlockObjectRequest[],
): Promise<string> {
  const response = await client.pages.create({
    parent: { type: 'page_id', page_id: parentId },
    properties: {
      title: {
        title: [{ type: 'text', text: { content: title, link: null } }],
      },
    },
    children: blocks,
  });
  return (response as { url: string }).url;
}
