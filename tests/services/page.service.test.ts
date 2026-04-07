import type { Client } from '@notionhq/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveUnknownBookmarks } from '../../src/services/page.service.js';

// A Notion block URL whose fragment encodes the block ID
const BLOCK_ID_HEX = 'aabbccdd11223344556677889900aabb';
const BLOCK_ID_UUID = 'aabbccdd-1122-3344-5566-77889900aabb';
const NOTION_BLOCK_URL = `https://www.notion.so/myworkspace/SomePage-${BLOCK_ID_HEX}#${BLOCK_ID_UUID}`;

function makeBookmarkBlock(url: string, captionText?: string) {
  return {
    type: 'bookmark',
    bookmark: {
      url,
      caption: captionText ? [{ plain_text: captionText }] : [],
    },
  };
}

function createMockClient(
  blockRetrieve: (args: { block_id: string }) => Promise<unknown>,
): Client {
  return {
    blocks: {
      retrieve: vi.fn().mockImplementation(blockRetrieve),
    },
  } as unknown as Client;
}

describe('resolveUnknownBookmarks', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns markdown unchanged when there are no unknown bookmark tags', async () => {
    const client = createMockClient(() => Promise.resolve({}));
    const md = '# Hello\n\nSome text without bookmarks.';

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(md);
    expect(client.blocks.retrieve).not.toHaveBeenCalled();
  });

  it('replaces bookmark tag with [caption](url) when caption is present', async () => {
    const bookmarkUrl = 'https://example.com/article';
    const client = createMockClient(() =>
      Promise.resolve(makeBookmarkBlock(bookmarkUrl, 'My Article')),
    );
    const md = `Check this out: <unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`;

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(
      'Check this out: [My Article](https://example.com/article)',
    );
    expect(client.blocks.retrieve).toHaveBeenCalledWith({
      block_id: BLOCK_ID_UUID,
    });
  });

  it('replaces bookmark tag with bare URL when caption is empty', async () => {
    const bookmarkUrl = 'https://example.com/no-caption';
    const client = createMockClient(() =>
      Promise.resolve(makeBookmarkBlock(bookmarkUrl)),
    );
    const md = `Link: <unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`;

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe('Link: https://example.com/no-caption');
  });

  it('leaves the original tag when block retrieval fails', async () => {
    const client = createMockClient(() =>
      Promise.reject(new Error('API error')),
    );
    const tag = `<unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`;
    const md = `Broken: ${tag}`;

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(`Broken: ${tag}`);
  });

  it('leaves the original tag when the block is not a bookmark type', async () => {
    const client = createMockClient(() =>
      Promise.resolve({ type: 'paragraph', paragraph: { rich_text: [] } }),
    );
    const tag = `<unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`;
    const md = `Content: ${tag}`;

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(`Content: ${tag}`);
  });

  it('does not touch unknown tags with a different alt attribute', async () => {
    const client = createMockClient(() => Promise.resolve({}));
    const md = '<unknown url="https://notion.so/page#abc123" alt="equation"/>';

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(md);
    expect(client.blocks.retrieve).not.toHaveBeenCalled();
  });

  it('resolves multiple bookmark tags in one pass', async () => {
    const blockIdUuid2 = 'ccddee00-1122-3344-5566-7788990011cc';
    const notionUrl2 = `https://www.notion.so/page#${blockIdUuid2}`;

    const client = createMockClient(({ block_id }) => {
      if (block_id === BLOCK_ID_UUID) {
        return Promise.resolve(makeBookmarkBlock('https://first.com', 'First'));
      }
      if (block_id === blockIdUuid2) {
        return Promise.resolve(
          makeBookmarkBlock('https://second.com', 'Second'),
        );
      }
      return Promise.reject(new Error('unknown block'));
    });

    const md = [
      `<unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`,
      `<unknown url="${notionUrl2}" alt="bookmark"/>`,
    ].join('\n');

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(
      '[First](https://first.com)\n[Second](https://second.com)',
    );
    expect(client.blocks.retrieve).toHaveBeenCalledTimes(2);
  });

  it('fetches a deduplicated block only once when the same tag appears multiple times', async () => {
    const bookmarkUrl = 'https://example.com/dedup';
    const retrieve = vi
      .fn()
      .mockResolvedValue(makeBookmarkBlock(bookmarkUrl, 'Dedup'));
    const client = { blocks: { retrieve } } as unknown as Client;

    const tag = `<unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`;
    const md = `${tag}\n${tag}`;

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe(
      '[Dedup](https://example.com/dedup)\n[Dedup](https://example.com/dedup)',
    );
    // Same block ID → fetched only once
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it('handles multi-segment rich text captions by joining plain_text fields', async () => {
    const client = createMockClient(() =>
      Promise.resolve({
        type: 'bookmark',
        bookmark: {
          url: 'https://example.com/rich',
          caption: [{ plain_text: 'Hello ' }, { plain_text: 'World' }],
        },
      }),
    );
    const md = `<unknown url="${NOTION_BLOCK_URL}" alt="bookmark"/>`;

    const result = await resolveUnknownBookmarks(client, md);

    expect(result).toBe('[Hello World](https://example.com/rich)');
  });
});
