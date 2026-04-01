import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockReadStdin } = vi.hoisted(() => ({
  mockReadStdin: vi.fn().mockResolvedValue(''),
}));

const {
  mockCreatePage,
  mockCreatePageInDatabase,
  mockFetchDatabaseSchema,
  mockUploadFilesAsBlocks,
} = vi.hoisted(() => ({
  mockCreatePage: vi
    .fn()
    .mockResolvedValue(
      'https://notion.so/Test-Page-aabbccddaabbccddaabbccddaabbccdd',
    ),
  mockCreatePageInDatabase: vi
    .fn()
    .mockResolvedValue(
      'https://notion.so/DB-Page-ccddaabbccddaabbccddaabbccddaabb',
    ),
  mockFetchDatabaseSchema: vi.fn(),
  mockUploadFilesAsBlocks: vi.fn().mockResolvedValue([]),
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
  createNotionClient: vi.fn(() => ({
    blocks: { children: { append: vi.fn().mockResolvedValue({}) } },
  })),
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

vi.mock('../../src/services/upload.service.js', () => ({
  uploadFilesAsBlocks: mockUploadFilesAsBlocks,
}));

vi.mock('../../src/utils/stdin.js', () => ({
  readStdin: mockReadStdin,
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

    // Simulate TTY so stdin path isn't triggered unexpectedly
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });

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
    expect(stdoutSpy).toHaveBeenCalledWith(
      'https://notion.so/Test-Page-aabbccddaabbccddaabbccddaabbccdd\n',
    );
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
    expect(stdoutSpy).toHaveBeenCalledWith(
      'https://notion.so/DB-Page-ccddaabbccddaabbccddaabbccddaabb\n',
    );
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

  it('--file attaches files after page creation', async () => {
    const fakeBlock = { type: 'image' };
    mockUploadFilesAsBlocks.mockResolvedValueOnce([fakeBlock]);

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Test Page',
      '--file',
      '/path/to/image.png',
    ]);

    expect(mockCreatePage).toHaveBeenCalled();
    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/image.png'],
      {},
      expect.anything(),
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('notion.so'),
    );
  });

  it('--file without markdown creates page with files only', async () => {
    const fakeBlock = { type: 'file' };
    mockUploadFilesAsBlocks.mockResolvedValueOnce([fakeBlock]);

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Files Only Page',
      '--file',
      '/path/to/doc.pdf',
      '--file',
      '/path/to/sheet.xlsx',
    ]);

    expect(mockCreatePage).toHaveBeenCalled();
    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/doc.pdf', '/path/to/sheet.xlsx'],
      {},
      expect.anything(),
    );
  });

  it('does not read stdin when --file is provided without -m in non-TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
    mockUploadFilesAsBlocks.mockResolvedValueOnce([{ type: 'file' }]);

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Files Only Page',
      '--file',
      '/path/to/doc.pdf',
    ]);

    expect(mockReadStdin).not.toHaveBeenCalled();
    expect(mockUploadFilesAsBlocks).toHaveBeenCalled();
  });

  it('--file propagates file-not-found error from uploadFilesAsBlocks', async () => {
    const { CliError } = await import('../../src/errors/cli-error.js');
    const { ErrorCodes } = await import('../../src/errors/codes.js');
    mockUploadFilesAsBlocks.mockRejectedValueOnce(
      new CliError(
        ErrorCodes.INVALID_ARG,
        'File not found: /no/such/file.png',
        'Provide a valid file path',
      ),
    );

    const cmd = createPageCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Test Page',
      '--file',
      '/no/such/file.png',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('File not found');
  });
});
