import type { Client } from '@notionhq/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addComment,
  appendMarkdown,
  replacePageContent,
  searchAndReplace,
} from '../../src/services/write.service.js';

function createMockClient() {
  return {
    pages: {
      updateMarkdown: vi.fn().mockResolvedValue({}),
      retrieveMarkdown: vi.fn().mockResolvedValue({ markdown: '' }),
      create: vi.fn().mockResolvedValue({ url: 'https://notion.so/new-page' }),
    },
    comments: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Client;
}

describe('appendMarkdown', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls SDK with no after field when called without options', async () => {
    await appendMarkdown(client, 'page-id', '# Hello');

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'insert_content',
      insert_content: { content: '# Hello' },
    });
  });

  it('calls SDK with no after field when called with empty options', async () => {
    await appendMarkdown(client, 'page-id', '# Hello', {});

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'insert_content',
      insert_content: { content: '# Hello' },
    });
  });

  it('calls SDK with insert_content.after when after option is provided', async () => {
    await appendMarkdown(client, 'page-id', '# Hello', {
      after: 'foo...bar',
    });

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'insert_content',
      insert_content: { content: '# Hello', after: 'foo...bar' },
    });
  });
});

describe('searchAndReplace', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls SDK with update_content for a single update', async () => {
    await searchAndReplace(client, 'page-id', [
      { oldStr: 'hello', newStr: 'world' },
    ]);

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'update_content',
      update_content: {
        content_updates: [{ old_str: 'hello', new_str: 'world' }],
      },
    });
  });

  it('calls SDK with update_content for multiple updates', async () => {
    await searchAndReplace(client, 'page-id', [
      { oldStr: 'foo', newStr: 'bar' },
      { oldStr: 'baz', newStr: 'qux' },
    ]);

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'update_content',
      update_content: {
        content_updates: [
          { old_str: 'foo', new_str: 'bar' },
          { old_str: 'baz', new_str: 'qux' },
        ],
      },
    });
  });

  it('sets replace_all_matches when replaceAll is true', async () => {
    await searchAndReplace(
      client,
      'page-id',
      [{ oldStr: 'hello', newStr: 'world' }],
      { replaceAll: true },
    );

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'update_content',
      update_content: {
        content_updates: [
          { old_str: 'hello', new_str: 'world', replace_all_matches: true },
        ],
      },
    });
  });

  it('sets allow_deleting_content when allowDeletingContent is true', async () => {
    await searchAndReplace(
      client,
      'page-id',
      [{ oldStr: 'hello', newStr: 'world' }],
      { allowDeletingContent: true },
    );

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'update_content',
      update_content: {
        content_updates: [{ old_str: 'hello', new_str: 'world' }],
        allow_deleting_content: true,
      },
    });
  });

  it('does not include replace_all_matches when replaceAll is false', async () => {
    await searchAndReplace(
      client,
      'page-id',
      [{ oldStr: 'hello', newStr: 'world' }],
      { replaceAll: false },
    );

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'update_content',
      update_content: {
        content_updates: [{ old_str: 'hello', new_str: 'world' }],
      },
    });
  });
});

describe('replacePageContent', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls SDK with replace_content and new content', async () => {
    await replacePageContent(client, 'page-id', '# New content');

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'replace_content',
      replace_content: {
        new_str: '# New content',
      },
    });
  });

  it('sets allow_deleting_content when allowDeletingContent is true', async () => {
    await replacePageContent(client, 'page-id', '# New content', {
      allowDeletingContent: true,
    });

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'replace_content',
      replace_content: {
        new_str: '# New content',
        allow_deleting_content: true,
      },
    });
  });

  it('does not include allow_deleting_content when not specified', async () => {
    await replacePageContent(client, 'page-id', '# New content');

    const call = vi.mocked(client.pages.updateMarkdown).mock.calls[0][0];
    expect(call).not.toHaveProperty('replace_content.allow_deleting_content');
  });
});

describe('addComment', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls client.comments.create with correct page_id and text content', async () => {
    await addComment(client, 'page-id', 'Hello world');

    expect(client.comments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { page_id: 'page-id' },
        rich_text: [
          expect.objectContaining({
            type: 'text',
            text: { content: 'Hello world', link: null },
          }),
        ],
      }),
    );
  });

  it('includes display_name when asUser option is provided', async () => {
    await addComment(client, 'page-id', 'User comment', { asUser: true });

    expect(client.comments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: { type: 'user' },
      }),
    );
  });
});
