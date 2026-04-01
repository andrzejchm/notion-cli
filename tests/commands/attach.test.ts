import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUploadFilesAsBlocks, mockBlocksChildrenAppend } = vi.hoisted(
  () => ({
    mockUploadFilesAsBlocks: vi.fn(),
    mockBlocksChildrenAppend: vi.fn(),
  }),
);

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
    blocks: { children: { append: mockBlocksChildrenAppend } },
  })),
}));

vi.mock('../../src/services/upload.service.js', () => ({
  uploadFilesAsBlocks: mockUploadFilesAsBlocks,
}));

import { attachCommand } from '../../src/commands/attach.js';
import { setOutputMode } from '../../src/output/format.js';

const VALID_PAGE_ID = 'b55c9c91384d452b81dbd1ef79372b75';
const VALID_PAGE_UUID = 'b55c9c91-384d-452b-81db-d1ef79372b75';

const fakeResponse = {
  object: 'list',
  results: [{ type: 'image', id: 'block-id-1' }],
};

describe('attachCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setOutputMode('auto');
    mockUploadFilesAsBlocks.mockResolvedValue([{ type: 'image' }]);
    mockBlocksChildrenAppend.mockResolvedValue(fakeResponse);
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

  it('attaches a single file to a page', async () => {
    const cmd = attachCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '/path/to/image.png']);

    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/image.png'],
      { caption: undefined, type: undefined },
      expect.anything(),
    );
    expect(mockBlocksChildrenAppend).toHaveBeenCalledWith({
      block_id: VALID_PAGE_UUID,
      children: expect.any(Array),
    });
    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('Attached 1 file(s) to');
    expect(output).toContain(VALID_PAGE_UUID.replace(/-/g, ''));
  });

  it('attaches multiple files to a page', async () => {
    mockUploadFilesAsBlocks.mockResolvedValueOnce([
      { type: 'image' },
      { type: 'file' },
    ]);

    const cmd = attachCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '/path/to/image.png',
      '/path/to/doc.pdf',
    ]);

    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/image.png', '/path/to/doc.pdf'],
      { caption: undefined, type: undefined },
      expect.anything(),
    );
    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('Attached 2 file(s) to');
  });

  it('passes --caption to uploadFilesAsBlocks', async () => {
    const cmd = attachCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '/path/to/image.png',
      '--caption',
      'My caption',
    ]);

    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/image.png'],
      { caption: 'My caption', type: undefined },
      expect.anything(),
    );
  });

  it('passes --type override to uploadFilesAsBlocks', async () => {
    const cmd = attachCommand();
    await cmd.parseAsync([
      'node',
      'test',
      VALID_PAGE_ID,
      '/path/to/file.bin',
      '--type',
      'file',
    ]);

    expect(mockUploadFilesAsBlocks).toHaveBeenCalledWith(
      ['/path/to/file.bin'],
      { caption: undefined, type: 'file' },
      expect.anything(),
    );
  });

  it('outputs JSON when --json mode is set globally', async () => {
    setOutputMode('json');

    const cmd = attachCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '/path/to/image.png']);

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(fakeResponse);
  });

  it('propagates file-not-found error from uploadFilesAsBlocks', async () => {
    const { CliError } = await import('../../src/errors/cli-error.js');
    const { ErrorCodes } = await import('../../src/errors/codes.js');
    mockUploadFilesAsBlocks.mockRejectedValueOnce(
      new CliError(
        ErrorCodes.INVALID_ARG,
        'File not found: /no/such/file.png',
        'Provide a valid file path',
      ),
    );

    const cmd = attachCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '/no/such/file.png']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('File not found');
  });

  it('propagates page-not-found error from blocks.children.append', async () => {
    const notFoundError = Object.assign(new Error('Could not find page'), {
      code: 'object_not_found',
      status: 404,
    });
    mockBlocksChildrenAppend.mockRejectedValueOnce(notFoundError);

    const cmd = attachCommand();
    await cmd.parseAsync(['node', 'test', VALID_PAGE_ID, '/path/to/image.png']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('Could not find page');
  });
});
