import { describe, it, expect } from 'vitest';
import { mdToBlocks } from '../../src/blocks/md-to-blocks.js';

describe('mdToBlocks', () => {
  describe('empty/blank input', () => {
    it('returns [] for empty string', () => {
      expect(mdToBlocks('')).toEqual([]);
    });

    it('returns [] for only blank lines', () => {
      expect(mdToBlocks('\n\n')).toEqual([]);
    });
  });

  describe('paragraph blocks', () => {
    it('converts plain text to paragraph block', () => {
      const result = mdToBlocks('Hello world');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
      const block = result[0] as Extract<typeof result[0], { type: 'paragraph' }>;
      expect(block.paragraph.rich_text).toHaveLength(1);
      expect(block.paragraph.rich_text[0].type).toBe('text');
      const rt = block.paragraph.rich_text[0] as Extract<typeof block.paragraph.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('Hello world');
    });
  });

  describe('heading blocks', () => {
    it('converts # to heading_1 block', () => {
      const result = mdToBlocks('# Heading');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading_1');
      const block = result[0] as Extract<typeof result[0], { type: 'heading_1' }>;
      const rt = block.heading_1.rich_text[0] as Extract<typeof block.heading_1.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('Heading');
    });

    it('converts ## to heading_2 block', () => {
      const result = mdToBlocks('## Subheading');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading_2');
      const block = result[0] as Extract<typeof result[0], { type: 'heading_2' }>;
      const rt = block.heading_2.rich_text[0] as Extract<typeof block.heading_2.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('Subheading');
    });

    it('converts ### to heading_3 block', () => {
      const result = mdToBlocks('### Section');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading_3');
      const block = result[0] as Extract<typeof result[0], { type: 'heading_3' }>;
      const rt = block.heading_3.rich_text[0] as Extract<typeof block.heading_3.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('Section');
    });
  });

  describe('list item blocks', () => {
    it('converts "- item" to bulleted_list_item block', () => {
      const result = mdToBlocks('- item');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('bulleted_list_item');
      const block = result[0] as Extract<typeof result[0], { type: 'bulleted_list_item' }>;
      const rt = block.bulleted_list_item.rich_text[0] as Extract<typeof block.bulleted_list_item.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('item');
    });

    it('converts "* item" to bulleted_list_item block', () => {
      const result = mdToBlocks('* item');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('bulleted_list_item');
    });

    it('converts "1. item" to numbered_list_item block', () => {
      const result = mdToBlocks('1. item');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('numbered_list_item');
      const block = result[0] as Extract<typeof result[0], { type: 'numbered_list_item' }>;
      const rt = block.numbered_list_item.rich_text[0] as Extract<typeof block.numbered_list_item.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('item');
    });
  });

  describe('quote blocks', () => {
    it('converts "> quote text" to quote block', () => {
      const result = mdToBlocks('> quote text');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('quote');
      const block = result[0] as Extract<typeof result[0], { type: 'quote' }>;
      const rt = block.quote.rich_text[0] as Extract<typeof block.quote.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('quote text');
    });
  });

  describe('code fence blocks', () => {
    it('converts code fence with language to code block', () => {
      const result = mdToBlocks('```ts\nconsole.log()\n```');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('code');
      const block = result[0] as Extract<typeof result[0], { type: 'code' }>;
      expect(block.code.language).toBe('ts');
      const rt = block.code.rich_text[0] as Extract<typeof block.code.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('console.log()');
    });

    it('converts code fence without language to code block with "plain text" language', () => {
      const result = mdToBlocks('```\nhello\n```');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('code');
      const block = result[0] as Extract<typeof result[0], { type: 'code' }>;
      expect(block.code.language).toBe('plain text');
    });
  });

  describe('inline annotations', () => {
    it('converts **bold** to paragraph with bold annotation', () => {
      const result = mdToBlocks('**bold**');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
      const block = result[0] as Extract<typeof result[0], { type: 'paragraph' }>;
      const rt = block.paragraph.rich_text[0] as Extract<typeof block.paragraph.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('bold');
      expect(rt.annotations?.bold).toBe(true);
    });

    it('converts _italic_ to paragraph with italic annotation', () => {
      const result = mdToBlocks('_italic_');
      expect(result).toHaveLength(1);
      const block = result[0] as Extract<typeof result[0], { type: 'paragraph' }>;
      const rt = block.paragraph.rich_text[0] as Extract<typeof block.paragraph.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('italic');
      expect(rt.annotations?.italic).toBe(true);
    });

    it('converts `code` to paragraph with code annotation', () => {
      const result = mdToBlocks('`code`');
      expect(result).toHaveLength(1);
      const block = result[0] as Extract<typeof result[0], { type: 'paragraph' }>;
      const rt = block.paragraph.rich_text[0] as Extract<typeof block.paragraph.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('code');
      expect(rt.annotations?.code).toBe(true);
    });

    it('converts [label](url) to paragraph with link', () => {
      const result = mdToBlocks('[label](https://example.com)');
      expect(result).toHaveLength(1);
      const block = result[0] as Extract<typeof result[0], { type: 'paragraph' }>;
      const rt = block.paragraph.rich_text[0] as Extract<typeof block.paragraph.rich_text[0], { type: 'text' }>;
      expect(rt.text.content).toBe('label');
      expect(rt.text.link).toEqual({ url: 'https://example.com' });
    });
  });

  describe('mixed content', () => {
    it('converts "# Hello\\nWorld" to [heading_1, paragraph]', () => {
      const result = mdToBlocks('# Hello\nWorld');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('heading_1');
      expect(result[1].type).toBe('paragraph');
    });

    it('skips blank lines between blocks', () => {
      const result = mdToBlocks('# Title\n\nsome text');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('heading_1');
      expect(result[1].type).toBe('paragraph');
    });

    it('handles heading with inline bold annotation', () => {
      const result = mdToBlocks('# Hello **bold**');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading_1');
      const block = result[0] as Extract<typeof result[0], { type: 'heading_1' }>;
      expect(block.heading_1.rich_text.length).toBeGreaterThan(1);
      const boldRt = block.heading_1.rich_text.find(
        rt => rt.type === 'text' && (rt as Extract<typeof rt, { type: 'text' }>).annotations?.bold === true
      );
      expect(boldRt).toBeDefined();
    });
  });
});
