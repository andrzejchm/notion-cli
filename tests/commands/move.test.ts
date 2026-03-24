import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPagesMove = vi.fn();
const mockDataSourcesRetrieve = vi.fn();
const mockDatabasesRetrieve = vi.fn();

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
    pages: { move: mockPagesMove },
    dataSources: { retrieve: mockDataSourcesRetrieve },
    databases: { retrieve: mockDatabasesRetrieve },
  })),
}));

import { moveCommand } from '../../src/commands/move.js';
import { setOutputMode } from '../../src/output/format.js';

describe('moveCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const fakeMovedPage = {
    id: 'b55c9c91-384d-452b-81db-d1ef79372b75',
    object: 'page',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setOutputMode('auto');
    mockPagesMove.mockResolvedValue(fakeMovedPage);
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

  it('moves a single page to a page parent', async () => {
    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--to',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ]);

    expect(mockPagesMove).toHaveBeenCalledWith({
      page_id: 'b55c9c91-384d-452b-81db-d1ef79372b75',
      parent: {
        type: 'page_id',
        page_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
    });
  });

  it('moves multiple pages to a page parent', async () => {
    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      'c66d0d02495e563c92ece2f80483c860',
      '--to',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ]);

    expect(mockPagesMove).toHaveBeenCalledTimes(2);
    expect(mockPagesMove).toHaveBeenCalledWith({
      page_id: 'b55c9c91-384d-452b-81db-d1ef79372b75',
      parent: {
        type: 'page_id',
        page_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
    });
    expect(mockPagesMove).toHaveBeenCalledWith({
      page_id: 'c66d0d02-495e-563c-92ec-e2f80483c860',
      parent: {
        type: 'page_id',
        page_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
    });
  });

  it('moves a page to a database parent via --to-db', async () => {
    mockDataSourcesRetrieve.mockRejectedValueOnce(new Error('not found'));
    mockDatabasesRetrieve.mockResolvedValueOnce({
      data_sources: [{ id: 'resolved-ds-id-0000-0000-000000000000' }],
    });

    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--to-db',
      'dbdbdbdb-1111-2222-3333-444444444444',
    ]);

    expect(mockPagesMove).toHaveBeenCalledWith({
      page_id: 'b55c9c91-384d-452b-81db-d1ef79372b75',
      parent: {
        type: 'data_source_id',
        data_source_id: 'resolved-ds-id-0000-0000-000000000000',
      },
    });
  });

  it('errors when neither --to nor --to-db is provided', async () => {
    const cmd = moveCommand();
    await cmd.parseAsync(['node', 'test', 'b55c9c91384d452b81dbd1ef79372b75']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('--to');
    expect(stderrOutput).toContain('--to-db');
  });

  it('errors when both --to and --to-db are provided', async () => {
    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--to',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      '--to-db',
      'dbdbdbdb-1111-2222-3333-444444444444',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('--to');
    expect(stderrOutput).toContain('--to-db');
  });

  it('outputs "Moved 1 page(s)." in text mode', async () => {
    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--to',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ]);

    expect(stdoutSpy).toHaveBeenCalledWith('Moved 1 page(s).\n');
  });

  it('outputs "Moved 2 page(s)." for multiple pages', async () => {
    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      'c66d0d02495e563c92ece2f80483c860',
      '--to',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ]);

    expect(stdoutSpy).toHaveBeenCalledWith('Moved 2 page(s).\n');
  });

  it('outputs JSON array in json mode', async () => {
    setOutputMode('json');
    const cmd = moveCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--to',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ]);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(output);
    expect(parsed).toEqual([fakeMovedPage]);
  });
});
