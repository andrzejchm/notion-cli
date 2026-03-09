import type { Client } from '@notionhq/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendMarkdown,
  replaceMarkdown,
} from '../../src/services/write.service.js';

function createMockClient() {
  return {
    pages: {
      updateMarkdown: vi.fn().mockResolvedValue({}),
      retrieveMarkdown: vi.fn().mockResolvedValue({ markdown: '' }),
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

  it('does nothing on empty page when new markdown is also empty', async () => {
    vi.mocked(client.pages.retrieveMarkdown).mockResolvedValue({
      markdown: '',
    } as never);

    await replaceMarkdown(client, 'page-id', '   ');

    expect(client.pages.updateMarkdown).not.toHaveBeenCalled();
  });
});
