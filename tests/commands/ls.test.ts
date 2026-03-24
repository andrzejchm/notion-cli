import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSearch = vi.fn();

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'test-token', source: 'env' }),
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({
    search: mockSearch,
  })),
}));

import { lsCommand } from '../../src/commands/ls.js';
import { setOutputMode } from '../../src/output/format.js';

describe('lsCommand --sort', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const fakeResponse = {
    results: [
      {
        object: 'page' as const,
        id: 'page-1',
        properties: {
          Name: {
            type: 'title' as const,
            title: [{ plain_text: 'Test Page' }],
          },
        },
        last_edited_time: '2026-03-20T10:00:00.000Z',
        parent: { type: 'workspace', workspace: true },
      },
    ],
    has_more: false,
    next_cursor: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setOutputMode('auto');
    mockSearch.mockResolvedValue(fakeResponse);
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
    setOutputMode('auto');
  });

  it('passes sort descending to the API when --sort desc is used', async () => {
    const cmd = lsCommand();
    await cmd.parseAsync(['node', 'test', '--sort', 'desc']);

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          timestamp: 'last_edited_time',
          direction: 'descending',
        },
      }),
    );
  });

  it('passes sort ascending to the API when --sort asc is used', async () => {
    const cmd = lsCommand();
    await cmd.parseAsync(['node', 'test', '--sort', 'asc']);

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          timestamp: 'last_edited_time',
          direction: 'ascending',
        },
      }),
    );
  });

  it('does not pass sort when --sort is omitted', async () => {
    const cmd = lsCommand();
    await cmd.parseAsync(['node', 'test']);

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: undefined,
      }),
    );
  });
});
