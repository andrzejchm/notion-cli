import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAppendMarkdown, mockReadStdin } = vi.hoisted(() => ({
  mockAppendMarkdown: vi.fn(),
  mockReadStdin: vi.fn(),
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
  appendMarkdown: mockAppendMarkdown,
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
});
