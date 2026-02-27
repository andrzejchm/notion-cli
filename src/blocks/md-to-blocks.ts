import type {
  BlockObjectRequest,
  RichTextItemRequest,
} from '@notionhq/client/build/src/api-endpoints.js';

// Inline regex: captures bold, italic (both * and _), inline code, links, and plain text
const INLINE_RE =
  /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|[^*_`\[]+)/g;

export function parseInlineMarkdown(text: string): RichTextItemRequest[] {
  const result: RichTextItemRequest[] = [];
  let match: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    const segment = match[0];

    // Bold: **text**
    if (segment.startsWith('**') && segment.endsWith('**')) {
      const content = segment.slice(2, -2);
      result.push({
        type: 'text',
        text: { content, link: null },
        annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
      } as RichTextItemRequest);
      continue;
    }

    // Italic: _text_ or *text*
    if (
      (segment.startsWith('_') && segment.endsWith('_')) ||
      (segment.startsWith('*') && segment.endsWith('*'))
    ) {
      const content = segment.slice(1, -1);
      result.push({
        type: 'text',
        text: { content, link: null },
        annotations: { bold: false, italic: true, strikethrough: false, underline: false, code: false, color: 'default' },
      } as RichTextItemRequest);
      continue;
    }

    // Inline code: `text`
    if (segment.startsWith('`') && segment.endsWith('`')) {
      const content = segment.slice(1, -1);
      result.push({
        type: 'text',
        text: { content, link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: true, color: 'default' },
      } as RichTextItemRequest);
      continue;
    }

    // Link: [label](url)
    const linkMatch = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      result.push({
        type: 'text',
        text: { content: label, link: { url } },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
      } as RichTextItemRequest);
      continue;
    }

    // Plain text
    result.push({
      type: 'text',
      text: { content: segment, link: null },
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
    } as RichTextItemRequest);
  }

  return result;
}

function makeRichText(text: string): RichTextItemRequest[] {
  return parseInlineMarkdown(text);
}

export function mdToBlocks(md: string): BlockObjectRequest[] {
  if (!md) return [];

  const lines = md.split('\n');
  const blocks: BlockObjectRequest[] = [];

  let inFence = false;
  let fenceLang = '';
  const fenceLines: string[] = [];

  for (const line of lines) {
    // Code fence start/end detection
    if (!inFence && line.startsWith('```')) {
      inFence = true;
      fenceLang = line.slice(3).trim() || 'plain text';
      fenceLines.length = 0;
      continue;
    }

    if (inFence) {
      if (line.startsWith('```')) {
        // End of code fence — emit code block
        const content = fenceLines.join('\n');
        blocks.push({
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text',
                text: { content, link: null },
                annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
              } as RichTextItemRequest,
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            language: fenceLang as any,
          },
        } as BlockObjectRequest);
        inFence = false;
        fenceLang = '';
        fenceLines.length = 0;
      } else {
        fenceLines.push(line);
      }
      continue;
    }

    // Skip blank lines
    if (line.trim() === '') continue;

    // Heading 1: # text
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      blocks.push({
        type: 'heading_1',
        heading_1: { rich_text: makeRichText(h1[1]) },
      } as BlockObjectRequest);
      continue;
    }

    // Heading 2: ## text
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      blocks.push({
        type: 'heading_2',
        heading_2: { rich_text: makeRichText(h2[1]) },
      } as BlockObjectRequest);
      continue;
    }

    // Heading 3: ### text
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      blocks.push({
        type: 'heading_3',
        heading_3: { rich_text: makeRichText(h3[1]) },
      } as BlockObjectRequest);
      continue;
    }

    // Bulleted list item: - text or * text
    const bullet = line.match(/^[-*] (.+)$/);
    if (bullet) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: makeRichText(bullet[1]) },
      } as BlockObjectRequest);
      continue;
    }

    // Numbered list item: 1. text
    const numbered = line.match(/^\d+\. (.+)$/);
    if (numbered) {
      blocks.push({
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: makeRichText(numbered[1]) },
      } as BlockObjectRequest);
      continue;
    }

    // Quote: > text
    const quote = line.match(/^> (.+)$/);
    if (quote) {
      blocks.push({
        type: 'quote',
        quote: { rich_text: makeRichText(quote[1]) },
      } as BlockObjectRequest);
      continue;
    }

    // Default: paragraph
    blocks.push({
      type: 'paragraph',
      paragraph: { rich_text: makeRichText(line) },
    } as BlockObjectRequest);
  }

  // If we ended in a code fence (no closing ```), emit as code block anyway
  if (inFence && fenceLines.length > 0) {
    const content = fenceLines.join('\n');
    blocks.push({
      type: 'code',
      code: {
        rich_text: [
          {
            type: 'text',
            text: { content, link: null },
            annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
          } as RichTextItemRequest,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        language: fenceLang as any,
      },
    } as BlockObjectRequest);
  }

  return blocks;
}
