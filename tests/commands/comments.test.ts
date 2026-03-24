import type { CommentObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPaginateResults } = vi.hoisted(() => ({
  mockPaginateResults: vi.fn(),
}));

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'fake-token', source: 'env' }),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({
    comments: { list: vi.fn() },
  })),
}));

vi.mock('../../src/output/paginate.js', () => ({
  paginateResults: mockPaginateResults,
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

import { commentsCommand } from '../../src/commands/comments.js';

const VALID_PAGE_ID = 'aabbccddaabbccddaabbccddaabbccdd';

function makeComment(
  overrides: Partial<CommentObjectResponse> = {},
): CommentObjectResponse {
  return {
    object: 'comment',
    id: 'comment-id-full-uuid-here-1234',
    discussion_id: 'disc-full-uuid-here-abcd1234',
    parent: { type: 'page_id', page_id: 'page-id' },
    created_time: '2026-03-20T10:00:00.000Z',
    created_by: { object: 'user', id: 'user-full-uuid-here-5678' },
    last_edited_time: '2026-03-20T10:00:00.000Z',
    rich_text: [
      {
        type: 'text',
        text: { content: 'Test comment', link: null },
        plain_text: 'Test comment',
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        href: null,
      },
    ],
    ...overrides,
  } as CommentObjectResponse;
}

describe('comments list command', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('shows discussion_id column in table output', async () => {
    mockPaginateResults.mockResolvedValueOnce([makeComment()]);

    const cmd = commentsCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID]);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('DISCUSSION');
    // First 8 chars of discussion_id
    expect(output).toContain('disc-ful');
  });

  it('shows parent type column in table output', async () => {
    mockPaginateResults.mockResolvedValueOnce([makeComment()]);

    const cmd = commentsCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID]);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('PARENT');
    expect(output).toContain('page');
  });

  it('shows block parent type for block-level comments', async () => {
    const blockComment = makeComment({
      parent: {
        type: 'block_id',
        block_id: 'block-abc',
      } as CommentObjectResponse['parent'],
    });
    mockPaginateResults.mockResolvedValueOnce([blockComment]);

    const cmd = commentsCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID]);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('block');
  });

  it('includes full discussion_id and parent in JSON output', async () => {
    mockPaginateResults.mockResolvedValueOnce([makeComment()]);

    const cmd = commentsCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '--json']);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(output);
    expect(parsed[0]).toHaveProperty(
      'discussion_id',
      'disc-full-uuid-here-abcd1234',
    );
    expect(parsed[0]).toHaveProperty('parent');
  });
});
