import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import type { BlockNode, PageWithBlocks } from '../services/page.service.js';
import { blockToMd } from './converters.js';
import { formatPropertyValue } from './properties.js';

function buildPropertiesHeader(page: PageObjectResponse): string {
  const lines: string[] = ['---'];
  for (const [name, prop] of Object.entries(page.properties)) {
    const value = formatPropertyValue(name, prop);
    if (value) {
      lines.push(`${name}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function renderBlockTree(blocks: BlockNode[]): string {
  const parts: string[] = [];
  let listCounter = 0;  // tracks consecutive numbered_list_item

  for (const node of blocks) {
    // Track numbered list position
    if (node.block.type === 'numbered_list_item') {
      listCounter++;
    } else {
      listCounter = 0;  // reset on any non-numbered block
    }

    // Recursively render children first
    const childrenMd = node.children.length > 0
      ? renderBlockTree(node.children)
      : '';

    const md = blockToMd(node.block, {
      listNumber: node.block.type === 'numbered_list_item' ? listCounter : undefined,
      childrenMd: childrenMd || undefined,
    });

    parts.push(md);
  }

  return parts.join('');
}

export function renderPageMarkdown({ page, blocks }: PageWithBlocks): string {
  const header = buildPropertiesHeader(page);
  const content = renderBlockTree(blocks);
  return header + content;
}
