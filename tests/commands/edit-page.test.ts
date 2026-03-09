import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockReplaceMarkdown, mockReadStdin } = vi.hoisted(() => ({
  mockReplaceMarkdown: vi.fn(),
  mockReadStdin: vi.fn(),
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
  createNotionClient: vi.fn(() => ({ pages: {} })),
}));

vi.mock('../../src/services/write.service.js', () => ({
  replaceMarkdown: mockReplaceMarkdown,
}));

vi.mock('../../src/utils/stdin.js', () => ({
  readStdin: mockReadStdin,
}));

import { editPageCommand } from '../../src/commands/edit-page.js';

describe('editPageCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceMarkdown.mockResolvedValue(undefined);
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

  describe('--help output', () => {
    it('shows updated description', () => {
      const cmd = editPageCommand();
      expect(cmd.description()).toBe(
        "replace a Notion page's content \u2014 full page or a targeted section",
      );
    });

    it('has --range option', () => {
      const cmd = editPageCommand();
      const rangeOpt = cmd.options.find((o) => o.long === '--range');
      expect(rangeOpt).toBeDefined();
      expect(rangeOpt?.description).toContain('ellipsis selector');
      expect(rangeOpt?.description).toContain('## My Section...last line');
    });

    it('has --allow-deleting-content option', () => {
      const cmd = editPageCommand();
      const opt = cmd.options.find(
        (o) => o.long === '--allow-deleting-content',
      );
      expect(opt).toBeDefined();
      expect(opt?.description).toContain('allow deletion');
    });
  });

  describe('full-page replace (no --range)', () => {
    it('calls replaceMarkdown without options (preserving existing behavior)', async () => {
      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# New content',
      ]);

      expect(mockReplaceMarkdown).toHaveBeenCalledWith(
        expect.anything(),
        'b55c9c91-384d-452b-81db-d1ef79372b75',
        '# New content',
      );
      // No options object passed — preserves existing behavior
      expect(mockReplaceMarkdown.mock.calls[0]).toHaveLength(3);
      expect(stdoutSpy).toHaveBeenCalledWith('Page content replaced.\n');
    });
  });

  describe('--range flag', () => {
    it('passes range and allowDeletingContent: false to replaceMarkdown', async () => {
      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# Updated section',
        '--range',
        '## Section...end',
      ]);

      expect(mockReplaceMarkdown).toHaveBeenCalledWith(
        expect.anything(),
        'b55c9c91-384d-452b-81db-d1ef79372b75',
        '# Updated section',
        { range: '## Section...end', allowDeletingContent: false },
      );
      expect(stdoutSpy).toHaveBeenCalledWith('Page content replaced.\n');
    });
  });

  describe('--range with --allow-deleting-content', () => {
    it('passes allowDeletingContent: true when both flags are set', async () => {
      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# Updated section',
        '--range',
        '## Section...end',
        '--allow-deleting-content',
      ]);

      expect(mockReplaceMarkdown).toHaveBeenCalledWith(
        expect.anything(),
        'b55c9c91-384d-452b-81db-d1ef79372b75',
        '# Updated section',
        { range: '## Section...end', allowDeletingContent: true },
      );
    });
  });

  describe('--allow-deleting-content without --range', () => {
    it('warns to stderr that the flag has no effect', async () => {
      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# New content',
        '--allow-deleting-content',
      ]);

      expect(stderrSpy).toHaveBeenCalledWith(
        'Warning: --allow-deleting-content has no effect without --range (full-page replace always allows deletion).\n',
      );
      // Operation still proceeds despite the warning
      expect(mockReplaceMarkdown).toHaveBeenCalled();
      expect(mockReplaceMarkdown.mock.calls[0]).toHaveLength(3);
    });
  });

  describe('validation_error handling', () => {
    it('surfaces validation_error as CliError with selector format hint', async () => {
      const notionError = new Error('Could not find content matching selector');
      Object.assign(notionError, { code: 'validation_error' });
      mockReplaceMarkdown.mockRejectedValueOnce(notionError);

      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# Updated',
        '--range',
        '## Bad...selector',
      ]);

      // withErrorHandling catches the CliError and writes to stderr
      expect(exitSpy).toHaveBeenCalledWith(1);
      const stderrOutput = stderrSpy.mock.calls
        .map((c) => String(c[0]))
        .join('');
      expect(stderrOutput).toContain('INVALID_ARG');
      expect(stderrOutput).toContain('Selector not found');
      expect(stderrOutput).toContain(
        'Could not find content matching selector',
      );
      expect(stderrOutput).toContain('notion read');
      expect(stderrOutput).toContain('ellipsis');
    });

    it('lets non-validation errors pass through to withErrorHandling', async () => {
      const otherError = new Error('Network failure');
      Object.assign(otherError, { code: 'internal_server_error' });
      mockReplaceMarkdown.mockRejectedValueOnce(otherError);

      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# Updated',
        '--range',
        '## Section...end',
      ]);

      // Non-validation error is re-thrown and caught by withErrorHandling's generic handler
      expect(exitSpy).toHaveBeenCalledWith(1);
      const stderrOutput = stderrSpy.mock.calls
        .map((c) => String(c[0]))
        .join('');
      expect(stderrOutput).toContain('Network failure');
      // Should NOT contain our custom suggestion (that's only for validation errors)
      expect(stderrOutput).not.toContain('notion read');
    });

    it('lets validation_error without --range pass through to withErrorHandling', async () => {
      const validationError = Object.assign(
        new Error('Some validation error'),
        { code: 'validation_error' },
      );
      mockReplaceMarkdown.mockRejectedValueOnce(validationError);

      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
        '-m',
        '# Updated',
      ]);

      expect(exitSpy).toHaveBeenCalledWith(1);
      const stderrOutput = stderrSpy.mock.calls
        .map((c) => String(c[0]))
        .join('');
      // Should NOT contain our custom selector-specific message
      expect(stderrOutput).not.toContain('Selector not found');
      // Should contain the raw error message from withErrorHandling
      expect(stderrOutput).toContain('Some validation error');
    });
  });

  describe('stdin content', () => {
    it('throws CliError when no -m and stdin is TTY', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });

      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
      ]);

      expect(exitSpy).toHaveBeenCalledWith(1);
      const stderrOutput = stderrSpy.mock.calls
        .map((c) => String(c[0]))
        .join('');
      expect(stderrOutput).toContain('No content provided');
    });

    it('throws CliError when no -m and stdin is empty', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true,
      });
      mockReadStdin.mockResolvedValueOnce('   ');

      const cmd = editPageCommand();
      await cmd.parseAsync([
        'node',
        'test',
        'b55c9c91384d452b81dbd1ef79372b75',
      ]);

      expect(exitSpy).toHaveBeenCalledWith(1);
      const stderrOutput = stderrSpy.mock.calls
        .map((c) => String(c[0]))
        .join('');
      expect(stderrOutput).toContain('stdin was empty');
    });
  });
});
