import type { Client } from '@notionhq/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPage,
  createPageInDatabase,
} from '../../src/services/write.service.js';

function createMockClient() {
  return {
    pages: {
      create: vi.fn().mockResolvedValue({ url: 'https://notion.so/new-page' }),
    },
  } as unknown as Client;
}

describe('createPage', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls client.pages.create with parent, title, and markdown', async () => {
    await createPage(client, 'parent-id', 'My Page', '# Content');

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { type: 'page_id', page_id: 'parent-id' },
        properties: {
          title: {
            title: [{ type: 'text', text: { content: 'My Page', link: null } }],
          },
        },
        markdown: '# Content',
      }),
    );
  });

  it('omits markdown field when content is whitespace-only', async () => {
    await createPage(client, 'parent-id', 'My Page', '   ');
    const call = vi.mocked(client.pages.create).mock.calls[0][0];
    expect(call).not.toHaveProperty('markdown');
  });

  it('returns the page URL from the response', async () => {
    vi.mocked(client.pages.create).mockResolvedValue({
      url: 'https://notion.so/my-page-123',
    } as never);

    const url = await createPage(client, 'parent-id', 'My Page', '# Content');

    expect(url).toBe('https://notion.so/my-page-123');
  });

  it('passes emoji icon when icon is a simple emoji', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: '🚀',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: { type: 'emoji', emoji: '🚀' },
      }),
    );
  });

  it('passes emoji icon when icon is a flag emoji (multi-codepoint)', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: '🇺🇸',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: { type: 'emoji', emoji: '🇺🇸' },
      }),
    );
  });

  it('passes emoji icon when icon is a skin-toned emoji', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: '👋🏽',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: { type: 'emoji', emoji: '👋🏽' },
      }),
    );
  });

  it('passes emoji icon when icon is a ZWJ sequence emoji', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: '👨‍👩‍👧‍👦',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: { type: 'emoji', emoji: '👨‍👩‍👧‍👦' },
      }),
    );
  });

  it('passes external icon when icon is an https URL', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: 'https://example.com/icon.png',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: {
          type: 'external',
          external: { url: 'https://example.com/icon.png' },
        },
      }),
    );
  });

  it('passes external icon when icon is an http URL', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: 'http://example.com/icon.png',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: {
          type: 'external',
          external: { url: 'http://example.com/icon.png' },
        },
      }),
    );
  });

  it('passes cover when cover URL is provided', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      cover: 'https://example.com/cover.jpg',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cover: {
          type: 'external',
          external: { url: 'https://example.com/cover.jpg' },
        },
      }),
    );
  });

  it('does not include icon or cover when not provided', async () => {
    await createPage(client, 'parent-id', 'My Page', '# Content');

    const call = vi.mocked(client.pages.create).mock.calls[0][0];
    expect(call).not.toHaveProperty('icon');
    expect(call).not.toHaveProperty('cover');
  });
});

describe('createPageInDatabase', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls client.pages.create with database_id parent and title property', async () => {
    await createPageInDatabase(client, 'db-id', 'Task Name', 'My Task', {}, '');

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { type: 'database_id', database_id: 'db-id' },
        properties: {
          'Task Name': {
            title: [{ type: 'text', text: { content: 'My Task', link: null } }],
          },
        },
      }),
    );
  });

  it('merges extra properties with the title property', async () => {
    const extraProps = {
      Status: { select: { name: 'Done' } },
      Priority: { number: 5 },
    };

    await createPageInDatabase(
      client,
      'db-id',
      'Name',
      'My Task',
      extraProps,
      '',
    );

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          Status: { select: { name: 'Done' } },
          Priority: { number: 5 },
          Name: {
            title: [{ type: 'text', text: { content: 'My Task', link: null } }],
          },
        },
      }),
    );
  });

  it('includes markdown when provided', async () => {
    await createPageInDatabase(
      client,
      'db-id',
      'Name',
      'My Task',
      {},
      '# Body content',
    );

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: '# Body content',
      }),
    );
  });

  it('omits markdown field when content is whitespace-only', async () => {
    await createPageInDatabase(client, 'db-id', 'Name', 'My Task', {}, '   ');

    const call = vi.mocked(client.pages.create).mock.calls[0][0];
    expect(call).not.toHaveProperty('markdown');
  });

  it('passes icon and cover options', async () => {
    await createPageInDatabase(client, 'db-id', 'Name', 'My Task', {}, '', {
      icon: '📋',
      cover: 'https://example.com/cover.jpg',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: { type: 'emoji', emoji: '📋' },
        cover: {
          type: 'external',
          external: { url: 'https://example.com/cover.jpg' },
        },
      }),
    );
  });

  it('returns the page URL from the response', async () => {
    vi.mocked(client.pages.create).mockResolvedValue({
      url: 'https://notion.so/db-page-123',
    } as never);

    const url = await createPageInDatabase(
      client,
      'db-id',
      'Name',
      'My Task',
      {},
      '',
    );

    expect(url).toBe('https://notion.so/db-page-123');
  });
});
