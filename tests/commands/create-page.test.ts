import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreatePage, mockCreatePageInDatabase, mockFetchDatabaseSchema } =
  vi.hoisted(() => ({
    mockCreatePage: vi.fn().mockResolvedValue('https://notion.so/new-page-123'),
    mockCreatePageInDatabase: vi
      .fn()
      .mockResolvedValue('https://notion.so/db-page-123'),
    mockFetchDatabaseSchema: vi.fn(),
  }));

const { mockBuildPropertiesPayload } = vi.hoisted(() => ({
  mockBuildPropertiesPayload: vi.fn().mockReturnValue({
    Status: { select: { name: 'Done' } },
  }),
}));

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'test-token', source: 'env' }),
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({})),
}));

vi.mock('../../src/services/write.service.js', () => ({
  createPage: mockCreatePage,
  createPageInDatabase: mockCreatePageInDatabase,
}));

vi.mock('../../src/services/database.service.js', () => ({
  fetchDatabaseSchema: mockFetchDatabaseSchema,
}));

vi.mock('../../src/services/update.service.js', () => ({
  buildPropertiesPayload: mockBuildPropertiesPayload,
}));

vi.mock('../../src/utils/stdin.js', () => ({
  readStdin: vi.fn().mockResolvedValue(''),
}));

import { createPageCommand } from '../../src/commands/create-page.js';

describe('createPageCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    // Default: parent is NOT a database (fetchDatabaseSchema rejects)
    mockFetchDatabaseSchema.mockRejectedValue(new Error('Not a database'));
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('creates a page under a page parent with title and message', async () => {
    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Test Page',
      '-m',
      '# Hello',
    ]);

    expect(mockCreatePage).toHaveBeenCalledWith(
      expect.anything(),
      'b55c9c91-384d-452b-81db-d1ef79372b75',
      'Test Page',
      '# Hello',
      { icon: undefined, cover: undefined },
    );
    expect(stdoutSpy).toHaveBeenCalledWith('https://notion.so/new-page-123\n');
  });

  it('creates a page in a database when parent is a database', async () => {
    mockFetchDatabaseSchema.mockResolvedValue({
      id: 'db-id',
      databaseId: 'actual-database-page-id',
      title: 'Tasks',
      properties: {
        'Task Name': { id: 'title', name: 'Task Name', type: 'title' },
        Status: { id: 'status', name: 'Status', type: 'select' },
      },
    });

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'My Task',
      '--prop',
      'Status=Done',
    ]);

    expect(mockBuildPropertiesPayload).toHaveBeenCalledWith(
      ['Status=Done'],
      expect.objectContaining({
        'Task Name': expect.objectContaining({ type: 'title' }),
        Status: expect.objectContaining({ type: 'select' }),
      }),
    );
    expect(mockCreatePageInDatabase).toHaveBeenCalledWith(
      expect.anything(),
      'actual-database-page-id',
      'Task Name',
      'My Task',
      { Status: { select: { name: 'Done' } } },
      '',
      { icon: undefined, cover: undefined },
    );
    expect(stdoutSpy).toHaveBeenCalledWith('https://notion.so/db-page-123\n');
  });

  it('errors when --prop is used with a page parent', async () => {
    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Test Page',
      '--prop',
      'Status=Done',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('--prop is only supported'),
    );
  });

  it('passes icon and cover to createPage for page parent', async () => {
    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Test Page',
      '--icon',
      '🚀',
      '--cover',
      'https://example.com/cover.jpg',
    ]);

    expect(mockCreatePage).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'Test Page',
      '',
      { icon: '🚀', cover: 'https://example.com/cover.jpg' },
    );
  });

  it('passes icon and cover to createPageInDatabase for database parent', async () => {
    mockFetchDatabaseSchema.mockResolvedValue({
      id: 'db-id',
      databaseId: 'actual-database-page-id',
      title: 'Tasks',
      properties: {
        Name: { id: 'title', name: 'Name', type: 'title' },
      },
    });

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'My Task',
      '--icon',
      '📋',
      '--cover',
      'https://example.com/cover.jpg',
    ]);

    expect(mockCreatePageInDatabase).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'Name',
      'My Task',
      {},
      '',
      { icon: '📋', cover: 'https://example.com/cover.jpg' },
    );
  });

  it('creates a database page without --prop flags (title only)', async () => {
    mockFetchDatabaseSchema.mockResolvedValue({
      id: 'db-id',
      databaseId: 'actual-database-page-id',
      title: 'Tasks',
      properties: {
        Name: { id: 'title', name: 'Name', type: 'title' },
      },
    });

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Simple Task',
    ]);

    expect(mockBuildPropertiesPayload).not.toHaveBeenCalled();
    expect(mockCreatePageInDatabase).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'Name',
      'Simple Task',
      {},
      '',
      { icon: undefined, cover: undefined },
    );
  });
});
