import type { Client } from '@notionhq/client';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'fake-token', source: 'env' }),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(),
}));

vi.mock('../../src/services/write.service.js', () => ({
  appendMarkdown: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

import { appendCommand } from '../../src/commands/append.js';
import { createNotionClient } from '../../src/notion/client.js';
import { appendMarkdown } from '../../src/services/write.service.js';

const VALID_PAGE_ID = 'aabbccddaabbccddaabbccddaabbccdd';

function createMockClient() {
  return {
    pages: {
      updateMarkdown: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Client;
}

/**
 * Runs the append command programmatically and captures output/errors.
 * Commander calls process.exit on errors, so we override exitOverride.
 */
async function runAppend(args: string[]): Promise<{ stdout: string }> {
  const cmd = appendCommand();
  const parent = new Command();
  parent.addCommand(cmd);

  // Capture stdout
  let stdout = '';
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string) => {
    stdout += chunk;
    return true;
  }) as typeof process.stdout.write;

  // Prevent Commander from calling process.exit
  parent.exitOverride();

  try {
    await parent.parseAsync(['node', 'test', 'append', ...args]);
  } finally {
    process.stdout.write = originalWrite;
  }

  return { stdout };
}

describe('append command', () => {
  let mockClient: Client;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.mocked(createNotionClient).mockReturnValue(mockClient);
    // Simulate non-TTY so stdin path isn't triggered unexpectedly
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('appends without --after (no regression)', async () => {
    await runAppend([VALID_PAGE_ID, '-m', 'hello world']);

    expect(appendMarkdown).toHaveBeenCalledWith(
      mockClient,
      expect.any(String),
      'hello world',
      {},
    );
  });

  it('passes after option to appendMarkdown when --after is provided', async () => {
    await runAppend([
      VALID_PAGE_ID,
      '-m',
      'new content',
      '--after',
      '## Section...end of section',
    ]);

    expect(appendMarkdown).toHaveBeenCalledWith(
      mockClient,
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
    vi.mocked(appendMarkdown).mockRejectedValueOnce(validationError);

    // withErrorHandling calls process.exit, so we need to intercept
    const stderrChunks: string[] = [];
    const originalStderrWrite = process.stderr.write;
    const originalExit = process.exit;
    process.stderr.write = ((chunk: string) => {
      stderrChunks.push(chunk);
      return true;
    }) as typeof process.stderr.write;
    process.exit = (() => {
      throw new Error('EXIT');
    }) as typeof process.exit;

    try {
      await runAppend([
        VALID_PAGE_ID,
        '-m',
        'content',
        '--after',
        'bad...selector',
      ]);
    } catch {
      // Expected — either Commander exitOverride or our process.exit mock
    } finally {
      process.stderr.write = originalStderrWrite;
      process.exit = originalExit;
    }

    const stderrOutput = stderrChunks.join('');
    expect(stderrOutput).toContain('INVALID_ARG');
    expect(stderrOutput).toContain('ellipsis');
    expect(stderrOutput).toContain('notion read');
  });
});
