import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { richTextToMd } from './rich-text.js';

export interface BlockConverterContext {
  listNumber?: number; // For numbered_list_item: the 1-based position in the list
  childrenMd?: string; // Pre-rendered children markdown (render.ts provides this)
}

type BlockConverter = (
  block: BlockObjectResponse,
  ctx?: BlockConverterContext,
) => string;

function indentChildren(childrenMd: string): string {
  return `${childrenMd
    .split('\n')
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join('\n')}\n`;
}

const converters: Record<string, BlockConverter> = {
  paragraph(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'paragraph' }>;
    return `${richTextToMd(b.paragraph.rich_text)}\n`;
  },

  heading_1(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'heading_1' }>;
    return `# ${richTextToMd(b.heading_1.rich_text)}\n`;
  },

  heading_2(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'heading_2' }>;
    return `## ${richTextToMd(b.heading_2.rich_text)}\n`;
  },

  heading_3(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'heading_3' }>;
    return `### ${richTextToMd(b.heading_3.rich_text)}\n`;
  },

  bulleted_list_item(block, ctx) {
    const b = block as Extract<
      BlockObjectResponse,
      { type: 'bulleted_list_item' }
    >;
    const text = richTextToMd(b.bulleted_list_item.rich_text);
    const header = `- ${text}\n`;
    if (ctx?.childrenMd) {
      return header + indentChildren(ctx.childrenMd);
    }
    return header;
  },

  numbered_list_item(block, ctx) {
    const b = block as Extract<
      BlockObjectResponse,
      { type: 'numbered_list_item' }
    >;
    const num = ctx?.listNumber ?? 1;
    return `${num}. ${richTextToMd(b.numbered_list_item.rich_text)}\n`;
  },

  to_do(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'to_do' }>;
    const checkbox = b.to_do.checked ? '[x]' : '[ ]';
    return `- ${checkbox} ${richTextToMd(b.to_do.rich_text)}\n`;
  },

  code(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'code' }>;
    const lang = b.code.language === 'plain text' ? '' : b.code.language;
    const content = richTextToMd(b.code.rich_text);
    return `\`\`\`${lang}\n${content}\n\`\`\`\n`;
  },

  quote(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'quote' }>;
    return `> ${richTextToMd(b.quote.rich_text)}\n`;
  },

  divider() {
    return '---\n';
  },

  callout(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'callout' }>;
    const text = richTextToMd(b.callout.rich_text);
    const icon = b.callout.icon;
    if (icon?.type === 'emoji') {
      return `> ${icon.emoji} ${text}\n`;
    }
    return `> ${text}\n`;
  },

  toggle(block, ctx) {
    const b = block as Extract<BlockObjectResponse, { type: 'toggle' }>;
    const header = `**${richTextToMd(b.toggle.rich_text)}**\n`;
    if (ctx?.childrenMd) {
      return header + ctx.childrenMd;
    }
    return header;
  },

  image(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'image' }>;
    const caption = richTextToMd(b.image.caption);
    if (b.image.type === 'file') {
      const url = b.image.file.url;
      const expiry = b.image.file.expiry_time;
      return `![${caption}](${url}) <!-- expires: ${expiry} -->\n`;
    }
    const url = b.image.external.url;
    return `![${caption}](${url})\n`;
  },

  bookmark(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'bookmark' }>;
    const caption = richTextToMd(b.bookmark.caption);
    const text = caption || b.bookmark.url;
    return `[${text}](${b.bookmark.url})\n`;
  },

  child_page(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'child_page' }>;
    return `### ${b.child_page.title}\n`;
  },

  child_database(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'child_database' }>;
    return `### ${b.child_database.title}\n`;
  },

  link_preview(block) {
    const b = block as Extract<BlockObjectResponse, { type: 'link_preview' }>;
    return `[${b.link_preview.url}](${b.link_preview.url})\n`;
  },
};

export function blockToMd(
  block: BlockObjectResponse,
  ctx?: BlockConverterContext,
): string {
  const converter = converters[block.type];
  if (converter) {
    return converter(block, ctx);
  }
  return `<!-- unsupported block: ${block.type} -->\n`;
}
