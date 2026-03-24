import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAddComment } = vi.hoisted(() => ({
  mockAddComment: vi.fn(),
}));

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'fake-token', source: 'env' }),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({})),
}));

vi.mock('../../src/services/write.service.js', () => ({
  addComment: mockAddComment,
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

import { commentAddCommand } from '../../src/commands/comment-add.js';

const VALID_PAGE_ID = 'aabbccddaabbccddaabbccddaabbccdd';

describe('comment add command', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddComment.mockResolvedValue(undefined);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('creates a page-level comment with <id> and -m', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '-m', 'hello']);

    expect(mockAddComment).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'page', pageId: expect.any(String) },
      'hello',
      expect.objectContaining({}),
    );
  });

  it('creates a reply with --reply-to (no id required)', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '-m',
      'thread reply',
      '--reply-to',
      'disc-abc-123',
    ]);

    expect(mockAddComment).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'reply', discussionId: 'disc-abc-123' },
      'thread reply',
      expect.objectContaining({}),
    );
  });

  it('creates a block-level comment with --block', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '-m',
      'block comment',
      '--block',
      'block-id-123',
    ]);

    expect(mockAddComment).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'block', blockId: 'block-id-123' },
      'block comment',
      expect.objectContaining({}),
    );
  });

  it('errors when neither <id> nor --reply-to nor --block is provided', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync(['node', 'test', '-m', 'orphan comment']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('INVALID_ARG');
  });

  it('errors when both --reply-to and --block are provided', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '-m',
      'ambiguous',
      '--reply-to',
      'disc-abc',
      '--block',
      'block-123',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('INVALID_ARG');
    expect(stderrOutput).toContain('mutually exclusive');
  });

  it('errors when a positional ID and --reply-to are both provided', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '-m',
      'ambiguous',
      '--reply-to',
      'disc-abc',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('INVALID_ARG');
    expect(stderrOutput).toContain('mutually exclusive');
  });

  it('prints confirmation on success', async () => {
    const cmd = commentAddCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '-m', 'hello']);

    const stdoutOutput = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stdoutOutput).toContain('Comment added');
  });
});
