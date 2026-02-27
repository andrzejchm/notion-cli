import { Client, collectPaginatedAPI, isFullBlock } from '@notionhq/client';
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

export interface BlockNode {
  block: BlockObjectResponse;
  children: BlockNode[];
}

export interface PageWithBlocks {
  page: PageObjectResponse;
  blocks: BlockNode[];
}

const MAX_CONCURRENT_REQUESTS = 3;

async function fetchBlockTree(
  client: Client,
  blockId: string,
  depth: number,
  maxDepth: number,
): Promise<BlockNode[]> {
  if (depth >= maxDepth) return [];

  const rawBlocks = await collectPaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  });

  const blocks = rawBlocks.filter(isFullBlock);

  // child_page and child_database are separate Notion pages — never recurse into them.
  // They render as headings/links; the user can `notion read <id>` them individually.
  const SKIP_RECURSE = new Set(['child_page', 'child_database']);

  const nodes: BlockNode[] = [];
  for (let i = 0; i < blocks.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = blocks.slice(i, i + MAX_CONCURRENT_REQUESTS);
    const batchNodes = await Promise.all(
      batch.map(async (block) => {
        const children = block.has_children && !SKIP_RECURSE.has(block.type)
          ? await fetchBlockTree(client, block.id, depth + 1, maxDepth)
          : [];
        return { block, children };
      }),
    );
    nodes.push(...batchNodes);
  }

  return nodes;
}

export async function fetchPageWithBlocks(
  client: Client,
  pageId: string,
): Promise<PageWithBlocks> {
  const page = (await client.pages.retrieve({ page_id: pageId })) as PageObjectResponse;
  const blocks = await fetchBlockTree(client, pageId, 0, 10);
  return { page, blocks };
}
