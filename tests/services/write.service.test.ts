import type { Client } from '@notionhq/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError } from '../../src/errors/cli-error.js';
import {
  addComment,
  appendMarkdown,
  createPage,
  createPageInDatabase,
  replaceMarkdown,
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

describe('replaceMarkdown', () => {
  let client: Client;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = createMockClient();
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('calls SDK with full-page content_range and allow_deleting_content: true when called without options', async () => {
    const existingContent =
      'Some existing page content that is long enough to trigger range building';
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: existingContent,
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content');

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: 'page-id',
        type: 'replace_content_range',
        replace_content_range: expect.objectContaining({
          content: '# New content',
          allow_deleting_content: true,
        }),
      }),
    );

    // Verify content_range is auto-built (not empty)
    const call = vi.mocked(client.pages.updateMarkdown).mock.calls[0][0] as {
      replace_content_range: { content_range: string };
    };
    expect(call.replace_content_range.content_range).toBeTruthy();
  });

  it('calls SDK with provided range and allow_deleting_content: false when range option is given', async () => {
    const existingContent = 'Some existing page content that is long enough';
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: existingContent,
    } as never);

    await replaceMarkdown(client, 'page-id', '# Updated section', {
      range: '## Section...end',
    });

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'replace_content_range',
      replace_content_range: {
        content: '# Updated section',
        content_range: '## Section...end',
        allow_deleting_content: false,
      },
    });
  });

  it('calls SDK with allow_deleting_content: true when range and allowDeletingContent: true are given', async () => {
    const existingContent = 'Some existing page content that is long enough';
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: existingContent,
    } as never);

    await replaceMarkdown(client, 'page-id', '# Updated section', {
      range: '## Section...end',
      allowDeletingContent: true,
    });

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'replace_content_range',
      replace_content_range: {
        content: '# Updated section',
        content_range: '## Section...end',
        allow_deleting_content: true,
      },
    });
  });

  it('falls back to insert_content on empty page with no options', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: '',
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content');

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'insert_content',
      insert_content: { content: '# New content' },
    });
  });

  it('falls back to insert_content on empty page even when range is provided', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: '   ',
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content', {
      range: '## Section...end',
    });

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith({
      page_id: 'page-id',
      type: 'insert_content',
      insert_content: { content: '# New content' },
    });
  });

  it('warns to stderr when --range is ignored on empty page', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: '   ',
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content', {
      range: '## Section...end',
    });

    expect(stderrSpy).toHaveBeenCalledWith(
      'Warning: page is empty, --range ignored, content inserted as-is.\n',
    );
  });

  it('does not warn to stderr on empty page when no range is provided', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: '',
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content');

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('throws CliError when content is truncated and no range is provided', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: 'Some content',
      truncated: true,
    } as never);

    await expect(
      replaceMarkdown(client, 'page-id', '# New content'),
    ).rejects.toThrow(CliError);

    await expect(
      replaceMarkdown(client, 'page-id', '# New content'),
    ).rejects.toThrow('too large for full-page replace');
  });

  it('does not throw when content is truncated but range is provided', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: 'Some content',
      truncated: true,
    } as never);

    await replaceMarkdown(client, 'page-id', '# Updated section', {
      range: '## Section...end',
    });

    expect(client.pages.updateMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'replace_content_range',
      }),
    );
  });

  it('does nothing on empty page when new markdown is also empty', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: '',
    } as never);

    await replaceMarkdown(client, 'page-id', '   ');

    expect(client.pages.updateMarkdown).not.toHaveBeenCalled();
  });

  it('uses full content as range when content is shorter than START_LEN * 2 (30 chars)', async () => {
    const shortContent = 'abcdefghijklmnopqrstuvwxyz012';
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: shortContent,
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content');

    const call = vi.mocked(client.pages.updateMarkdown).mock.calls[0][0] as {
      replace_content_range: { content_range: string };
    };
    expect(call.replace_content_range.content_range).toBe(shortContent);
  });

  it('grows end snippet to disambiguate repetitive suffixes', async () => {
    const content = '# Title\n\nHello world. End. End. End.';
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: content,
    } as never);

    await replaceMarkdown(client, 'page-id', '# New content');

    const call = vi.mocked(client.pages.updateMarkdown).mock.calls[0][0] as {
      replace_content_range: { content_range: string };
    };
    const range = call.replace_content_range.content_range;
    // Range must start with the first 15 chars
    expect(range.startsWith('# Title\n\nHello')).toBe(true);
    // Range must contain the ellipsis separator
    expect(range).toContain('...');
    // The end snippet must be unique in the content (appears exactly once)
    const endSnippet = range.split('...').slice(1).join('...');
    let count = 0;
    let pos = content.indexOf(endSnippet, 0);
    while (pos !== -1) {
      count++;
      pos = content.indexOf(endSnippet, pos + endSnippet.length);
    }
    expect(count).toBe(1);
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

  it('passes emoji icon when icon is a single character', async () => {
    await createPage(client, 'parent-id', 'My Page', '', {
      icon: '🚀',
    });

    expect(client.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: { type: 'emoji', emoji: '🚀' },
      }),
    );
  });

  it('passes external icon when icon is a URL', async () => {
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
