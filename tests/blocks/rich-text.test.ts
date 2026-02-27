import { describe, it, expect } from 'vitest';
import { richTextToMd } from '../../src/blocks/rich-text.js';
import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints.js';

// Helper to build a text segment with default annotations
function textSegment(
  content: string,
  overrides: Partial<{
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
    link: { url: string } | null;
    href: string | null;
  }> = {}
): RichTextItemResponse {
  return {
    type: 'text',
    text: {
      content,
      link: overrides.link !== undefined ? overrides.link : null,
    },
    annotations: {
      bold: overrides.bold ?? false,
      italic: overrides.italic ?? false,
      strikethrough: overrides.strikethrough ?? false,
      underline: overrides.underline ?? false,
      code: overrides.code ?? false,
      color: (overrides.color ?? 'default') as RichTextItemResponse['annotations']['color'],
    },
    plain_text: content,
    href: overrides.href !== undefined ? overrides.href : null,
  };
}

describe('richTextToMd', () => {
  describe('empty input', () => {
    it('returns empty string for empty array', () => {
      expect(richTextToMd([])).toBe('');
    });
  });

  describe('plain text', () => {
    it('returns plain text with no annotations', () => {
      expect(richTextToMd([textSegment('hello')])).toBe('hello');
    });
  });

  describe('bold', () => {
    it('wraps bold text with **', () => {
      expect(richTextToMd([textSegment('hello', { bold: true })])).toBe('**hello**');
    });
  });

  describe('italic', () => {
    it('wraps italic text with _', () => {
      expect(richTextToMd([textSegment('hello', { italic: true })])).toBe('_hello_');
    });
  });

  describe('bold + italic', () => {
    it('wraps bold+italic text with **_..._**', () => {
      expect(richTextToMd([textSegment('hello', { bold: true, italic: true })])).toBe('**_hello_**');
    });
  });

  describe('inline code', () => {
    it('wraps code text with backticks', () => {
      expect(richTextToMd([textSegment('hello', { code: true })])).toBe('`hello`');
    });
  });

  describe('strikethrough', () => {
    it('wraps strikethrough text with ~~', () => {
      expect(richTextToMd([textSegment('hello', { strikethrough: true })])).toBe('~~hello~~');
    });
  });

  describe('underline', () => {
    it('outputs plain text for underline (no markdown equivalent)', () => {
      expect(richTextToMd([textSegment('hello', { underline: true })])).toBe('hello');
    });
  });

  describe('color', () => {
    it('outputs plain text for non-default color (no markdown equivalent)', () => {
      expect(richTextToMd([textSegment('hello', { color: 'red' })])).toBe('hello');
    });
  });

  describe('link', () => {
    it('wraps linked text as [text](url)', () => {
      expect(
        richTextToMd([textSegment('hello', { link: { url: 'https://example.com' } })])
      ).toBe('[hello](https://example.com)');
    });

    it('wraps bold linked text as [**text**](url)', () => {
      expect(
        richTextToMd([textSegment('hello', { bold: true, link: { url: 'https://example.com' } })])
      ).toBe('[**hello**](https://example.com)');
    });
  });

  describe('multiple segments', () => {
    it('concatenates multiple segments', () => {
      expect(
        richTextToMd([
          textSegment('hello', { bold: true }),
          textSegment(' world'),
        ])
      ).toBe('**hello** world');
    });
  });

  describe('mention', () => {
    it('uses plain_text for mention without href', () => {
      const segment: RichTextItemResponse = {
        type: 'mention',
        mention: { type: 'user', user: { id: 'user-id', object: 'user' } },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: '@John',
        href: null,
      };
      expect(richTextToMd([segment])).toBe('@John');
    });

    it('wraps mention with href as [plain_text](href)', () => {
      const segment: RichTextItemResponse = {
        type: 'mention',
        mention: { type: 'page', page: { id: 'page-id' } },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'My Page',
        href: 'https://notion.so/my-page',
      };
      expect(richTextToMd([segment])).toBe('[My Page](https://notion.so/my-page)');
    });
  });

  describe('equation', () => {
    it('wraps equation expression in $...$', () => {
      const segment: RichTextItemResponse = {
        type: 'equation',
        equation: { expression: 'e=mc^2' },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'e=mc^2',
        href: null,
      };
      expect(richTextToMd([segment])).toBe('$e=mc^2$');
    });
  });
});
