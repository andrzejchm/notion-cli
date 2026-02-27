import { describe, it, expect } from 'vitest';
import { blockToMd } from '../../src/blocks/converters.js';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints.js';

// Helper to build a minimal rich text array with plain text
function rt(content: string): RichTextItemResponse[] {
  return [
    {
      type: 'text',
      text: { content, link: null },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
      plain_text: content,
      href: null,
    },
  ];
}

// Helper to build a minimal block fixture
function makeBlock(type: string, typeData: unknown, extra?: unknown): BlockObjectResponse {
  return {
    object: 'block',
    id: 'test-id',
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-id' },
    last_edited_by: { object: 'user', id: 'user-id' },
    has_children: false,
    archived: false,
    in_trash: false,
    parent: { type: 'page_id', page_id: 'parent-id' },
    type,
    [type]: typeData,
    ...extra,
  } as unknown as BlockObjectResponse;
}

describe('blockToMd', () => {
  // paragraph
  it('renders paragraph as text + newline', () => {
    const block = makeBlock('paragraph', { rich_text: rt('Hello world'), color: 'default' });
    expect(blockToMd(block)).toBe('Hello world\n');
  });

  // heading_1
  it('renders heading_1 as # text', () => {
    const block = makeBlock('heading_1', {
      rich_text: rt('Title'),
      color: 'default',
      is_toggleable: false,
    });
    expect(blockToMd(block)).toBe('# Title\n');
  });

  // heading_2
  it('renders heading_2 as ## text', () => {
    const block = makeBlock('heading_2', {
      rich_text: rt('Title'),
      color: 'default',
      is_toggleable: false,
    });
    expect(blockToMd(block)).toBe('## Title\n');
  });

  // heading_3
  it('renders heading_3 as ### text', () => {
    const block = makeBlock('heading_3', {
      rich_text: rt('Title'),
      color: 'default',
      is_toggleable: false,
    });
    expect(blockToMd(block)).toBe('### Title\n');
  });

  // bulleted_list_item (no children)
  it('renders bulleted_list_item as - text', () => {
    const block = makeBlock('bulleted_list_item', {
      rich_text: rt('Item'),
      color: 'default',
    });
    expect(blockToMd(block)).toBe('- Item\n');
  });

  // bulleted_list_item (with children indented)
  it('indents children of bulleted_list_item', () => {
    const block = makeBlock('bulleted_list_item', {
      rich_text: rt('Item'),
      color: 'default',
    });
    expect(blockToMd(block, { childrenMd: '- Child\n' })).toBe('- Item\n  - Child\n');
  });

  // numbered_list_item with ctx.listNumber
  it('renders numbered_list_item with provided number', () => {
    const block = makeBlock('numbered_list_item', {
      rich_text: rt('Item'),
      color: 'default',
    });
    expect(blockToMd(block, { listNumber: 2 })).toBe('2. Item\n');
  });

  // numbered_list_item without listNumber defaults to 1
  it('renders numbered_list_item defaulting to 1 when no listNumber', () => {
    const block = makeBlock('numbered_list_item', {
      rich_text: rt('Item'),
      color: 'default',
    });
    expect(blockToMd(block)).toBe('1. Item\n');
  });

  // to_do unchecked
  it('renders unchecked to_do', () => {
    const block = makeBlock('to_do', {
      rich_text: rt('Task'),
      checked: false,
      color: 'default',
    });
    expect(blockToMd(block)).toBe('- [ ] Task\n');
  });

  // to_do checked
  it('renders checked to_do', () => {
    const block = makeBlock('to_do', {
      rich_text: rt('Task'),
      checked: true,
      color: 'default',
    });
    expect(blockToMd(block)).toBe('- [x] Task\n');
  });

  // code block with language
  it('renders code block with language fence', () => {
    const block = makeBlock('code', {
      rich_text: rt('console.log("hi");'),
      language: 'javascript',
      caption: [],
    });
    expect(blockToMd(block)).toBe('```javascript\nconsole.log("hi");\n```\n');
  });

  // code block with 'plain text' language (use empty fence)
  it('uses empty language for plain text code', () => {
    const block = makeBlock('code', {
      rich_text: rt('content'),
      language: 'plain text',
      caption: [],
    });
    expect(blockToMd(block)).toBe('```\ncontent\n```\n');
  });

  // quote
  it('renders quote as > text', () => {
    const block = makeBlock('quote', {
      rich_text: rt('Hello'),
      color: 'default',
    });
    expect(blockToMd(block)).toBe('> Hello\n');
  });

  // divider
  it('renders divider as ---', () => {
    const block = makeBlock('divider', {});
    expect(blockToMd(block)).toBe('---\n');
  });

  // callout with emoji icon
  it('renders callout with emoji prefix', () => {
    const block = makeBlock('callout', {
      rich_text: rt('Note content'),
      icon: { type: 'emoji', emoji: '💡' },
      color: 'default',
    });
    expect(blockToMd(block)).toBe('> 💡 Note content\n');
  });

  // callout without icon
  it('renders callout without icon', () => {
    const block = makeBlock('callout', {
      rich_text: rt('Note content'),
      icon: null,
      color: 'default',
    });
    expect(blockToMd(block)).toBe('> Note content\n');
  });

  // toggle (bold heading, no children)
  it('renders toggle header as bold with no children', () => {
    const block = makeBlock('toggle', {
      rich_text: rt('Toggle title'),
      color: 'default',
    });
    expect(blockToMd(block)).toBe('**Toggle title**\n');
  });

  // toggle with children
  it('renders toggle header as bold with children appended', () => {
    const block = makeBlock('toggle', {
      rich_text: rt('Toggle title'),
      color: 'default',
    });
    expect(blockToMd(block, { childrenMd: 'Child content\n' })).toBe(
      '**Toggle title**\nChild content\n'
    );
  });

  // image (external URL, no caption)
  it('renders external image as ![](url)', () => {
    const block = makeBlock('image', {
      type: 'external',
      external: { url: 'https://example.com/img.png' },
      caption: [],
    });
    expect(blockToMd(block)).toBe('![](https://example.com/img.png)\n');
  });

  // image with caption
  it('includes caption in image alt text', () => {
    const block = makeBlock('image', {
      type: 'external',
      external: { url: 'https://example.com/img.png' },
      caption: rt('My image'),
    });
    expect(blockToMd(block)).toBe('![My image](https://example.com/img.png)\n');
  });

  // image (Notion-hosted, has expiry_time)
  it('adds expiry comment for Notion-hosted images', () => {
    const block = makeBlock('image', {
      type: 'file',
      file: {
        url: 'https://notion.so/signed/...',
        expiry_time: '2026-02-27T00:00:00.000Z',
      },
      caption: [],
    });
    expect(blockToMd(block)).toBe(
      '![](https://notion.so/signed/...) <!-- expires: 2026-02-27T00:00:00.000Z -->\n'
    );
  });

  // bookmark (no caption)
  it('renders bookmark as [url](url)', () => {
    const block = makeBlock('bookmark', {
      url: 'https://example.com',
      caption: [],
    });
    expect(blockToMd(block)).toBe('[https://example.com](https://example.com)\n');
  });

  // bookmark with caption
  it('renders bookmark caption as link text', () => {
    const block = makeBlock('bookmark', {
      url: 'https://example.com',
      caption: rt('Read more'),
    });
    expect(blockToMd(block)).toBe('[Read more](https://example.com)\n');
  });

  // child_page
  it('renders child_page as ### heading', () => {
    const block = makeBlock('child_page', { title: 'Child Page' });
    expect(blockToMd(block)).toBe('### Child Page\n');
  });

  // child_database
  it('renders child_database as ### heading', () => {
    const block = makeBlock('child_database', { title: 'My Database' });
    expect(blockToMd(block)).toBe('### My Database\n');
  });

  // unknown type (unsupported)
  it('renders unknown block type as HTML comment placeholder', () => {
    const block = makeBlock('unsupported', {});
    expect(blockToMd(block)).toBe('<!-- unsupported block: unsupported -->\n');
  });

  // completely novel type
  it('renders completely novel block type as HTML comment placeholder', () => {
    const block = makeBlock('some_future_type', {});
    expect(blockToMd(block)).toBe('<!-- unsupported block: some_future_type -->\n');
  });
});
