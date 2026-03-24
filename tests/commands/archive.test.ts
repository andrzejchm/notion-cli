import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPagesUpdate = vi.fn();

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
    pages: { update: mockPagesUpdate },
  })),
}));

import { archiveCommand } from '../../src/commands/archive.js';
import { setOutputMode } from '../../src/output/format.js';

describe('archiveCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const fakePage = {
    id: 'b55c9c91-384d-452b-81db-d1ef79372b75',
    archived: true,
    object: 'page',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setOutputMode('auto');
    mockPagesUpdate.mockResolvedValue(fakePage);
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

  it('calls client.pages.update with archived: true', async () => {
    const cmd = archiveCommand();
    await cmd.parseAsync(['node', 'test', 'b55c9c91384d452b81dbd1ef79372b75']);

    expect(mockPagesUpdate).toHaveBeenCalledWith({
      page_id: 'b55c9c91-384d-452b-81db-d1ef79372b75',
      archived: true,
    });
  });

  it('outputs "Page archived." in text mode', async () => {
    const cmd = archiveCommand();
    await cmd.parseAsync(['node', 'test', 'b55c9c91384d452b81dbd1ef79372b75']);

    expect(stdoutSpy).toHaveBeenCalledWith('Page archived.\n');
  });

  it('outputs JSON in json mode', async () => {
    setOutputMode('json');
    const cmd = archiveCommand();
    await cmd.parseAsync(['node', 'test', 'b55c9c91384d452b81dbd1ef79372b75']);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(fakePage);
  });
});
