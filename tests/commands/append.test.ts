import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAppendMarkdown, mockReadStdin, mockUploadFilesAsBlocks } =
  vi.hoisted(() => ({
    mockAppendMarkdown: vi.fn(),
    mockReadStdin: vi.fn(),
    mockUploadFilesAsBlocks: vi.fn(),
  }));

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'fake-token', source: 'env' }),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({
    blocks: { children: { append: vi.fn().mockResolvedValue({}) } },
  })),
}));

vi.mock('../../src/services/write.service.js', () => ({
  appendMarkdown: mockAppendMarkdown,
}));

vi.mock('../../src/services/upload.service.js', () => ({
  uploadFilesAsBlocks: mockUploadFilesAsBlocks,
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

vi.mock('../../src/utils/stdin.js', () => ({
  readStdin: mockReadStdin,
}));

import { appendCommand } from '../../src/commands/append.js';

const VALID_PAGE_ID = 'aabbccddaabbccddaabbccddaabbccdd';

describe('append command', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendMarkdown.mockResolvedValue(undefined);
    mockUploadFilesAsBlocks.mockResolvedValue([]);
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
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('appends without --after (no regression)', async () => {
    const cmd = appendCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '-m', 'hello world']);

    expect(mockAppendMarkdown).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'hello world',
      undefined,
    );
  });

  it('passes after option to appendMarkdown when --after is provided', async () => {
    const cmd = appendCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '-m',
      'new content',
      '--after',
      '## Section...end of section',
    ]);

    expect(mockAppendMarkdown).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'new content',
      { after: '## Section...end of section' },
    );
  });

  it('shows --after in help output', () => {
    const cmd = appendCommand();
    const helpText = cmd.helpInformation();

    expect(helpText).toContain('--after');
    expect(helpText).toContain('ellipsis selector');
  });

  it('surfaces validation_error as CliError with selector format hint', async () => {
    const validationError = Object.assign(
      new Error('Could not find content matching selector'),
      { code: 'validation_error' },
    );
    mockAppendMarkdown.mockRejectedValueOnce(validationError);

    const cmd = appendCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '-m',
      'content',
      '--after',
      'bad...selector',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('INVALID_ARG');
    expect(stderrOutput).toContain('Selector not found');
    expect(stderrOutput).toContain('ellipsis');
    expect(stderrOutput).toContain('notion read');
  });

  it('reads content from stdin when not TTY and no -m', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
    mockReadStdin.mockResolvedValueOnce('# From stdin');

    const cmd = appendCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID]);

    expect(mockAppendMarkdown).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      '# From stdin',
      undefined,
    );
  });

  it('lets validation_error without --after pass through to withErrorHandling', async () => {
    const validationError = Object.assign(new Error('Some validation error'), {
      code: 'validation_error',
    });
    mockAppendMarkdown.mockRejectedValueOnce(validationError);

    const cmd = appendCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '-m', 'content']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    // Should NOT contain our custom selector-specific message
    expect(stderrOutput).not.toContain('Selector not found');
    // Should contain the raw error message from withErrorHandling
    expect(stderrOutput).toContain('Some validation error');
  });

  it('--file attaches files after markdown content', async () => {
    const fakeBlock = { type: 'image' };
    mockUploadFilesAsBlocks.mockResolvedValueOnce([fakeBlock]);

    const cmd = appendCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '-m',
      '# Hello',
      '--file',
      '/path/to/image.png',
    ]);

    expect(mockAppendMarkdown).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      '# Hello',
      undefined,
    );
    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/image.png'],
      {},
      expect.anything(),
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      'Appended and attached 1 file(s).\n',
    );
  });

  it('--file without markdown outputs "Attached N file(s)."', async () => {
    const fakeBlock = { type: 'file' };
    mockUploadFilesAsBlocks.mockResolvedValueOnce([fakeBlock]);

    const cmd = appendCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '--file',
      '/path/to/doc.pdf',
    ]);

    expect(mockAppendMarkdown).not.toHaveBeenCalled();
    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/doc.pdf'],
      {},
      expect.anything(),
    );
    expect(stdoutSpy).toHaveBeenCalledWith('Attached 1 file(s).\n');
  });

  it('does not read stdin when --file is provided without -m in non-TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
    mockUploadFilesAsBlocks.mockResolvedValueOnce([{ type: 'file' }]);

    const cmd = appendCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
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

    const cmd = appendCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '--file',
      '/no/such/file.png',
    ]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('File not found');
  });
});
