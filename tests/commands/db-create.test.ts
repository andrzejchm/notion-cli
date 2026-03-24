import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateDatabase, mockParsePropertyDefinitions } = vi.hoisted(() => ({
  mockCreateDatabase: vi.fn().mockResolvedValue({
    object: 'database',
    id: 'db-id-123',
    url: 'https://notion.so/db-123',
    title: [{ plain_text: 'Tasks' }],
  }),
  mockParsePropertyDefinitions: vi
    .fn()
    .mockReturnValue({ Name: { title: {} } }),
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

vi.mock('../../src/services/database.service.js', () => ({
  createDatabase: mockCreateDatabase,
  parsePropertyDefinitions: mockParsePropertyDefinitions,
}));

import { dbCreateCommand } from '../../src/commands/db/create.js';
import { setOutputMode } from '../../src/output/format.js';

describe('dbCreateCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setOutputMode('auto');
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
  });

  it('outputs URL by default', async () => {
    const cmd = dbCreateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Tasks',
    ]);

    expect(stdoutSpy).toHaveBeenCalledWith('https://notion.so/db-123\n');
  });

  it('outputs JSON when global output mode is json', async () => {
    setOutputMode('json');

    const cmd = dbCreateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      '--parent',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'Tasks',
    ]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(
      expect.objectContaining({
        id: 'db-id-123',
        url: 'https://notion.so/db-123',
      }),
    );
  });
});
