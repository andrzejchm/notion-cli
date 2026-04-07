import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockResolveDataSourceId,
  mockFetchDatabaseSchema,
  mockBuildDatabaseUpdatePayload,
  mockUpdateDatabaseSchema,
} = vi.hoisted(() => ({
  mockResolveDataSourceId: vi
    .fn()
    .mockResolvedValue('aabbccdd-1122-3344-5566-778899aabbcc'),
  mockFetchDatabaseSchema: vi.fn().mockResolvedValue({
    id: 'aabbccdd-1122-3344-5566-778899aabbcc',
    databaseId: 'db-id-123',
    title: 'My DB',
    properties: {
      Name: { id: 'title-id', name: 'Name', type: 'title' },
      Status: {
        id: 'status-id',
        name: 'Status',
        type: 'select',
        options: [{ name: 'Todo' }, { name: 'Done' }],
      },
      Tags: {
        id: 'tags-id',
        name: 'Tags',
        type: 'multi_select',
        options: [{ name: 'bug' }],
      },
    },
  }),
  mockBuildDatabaseUpdatePayload: vi.fn().mockReturnValue({ properties: {} }),
  mockUpdateDatabaseSchema: vi.fn().mockResolvedValue({
    object: 'data_source',
    id: 'aabbccdd-1122-3344-5566-778899aabbcc',
    url: 'https://notion.so/db-123',
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

vi.mock('../../src/services/database.service.js', () => ({
  resolveDataSourceId: mockResolveDataSourceId,
  fetchDatabaseSchema: mockFetchDatabaseSchema,
  buildDatabaseUpdatePayload: mockBuildDatabaseUpdatePayload,
  updateDatabaseSchema: mockUpdateDatabaseSchema,
}));

import { dbUpdateCommand } from '../../src/commands/db/update.js';
import { setOutputMode } from '../../src/output/format.js';

describe('dbUpdateCommand', () => {
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

  it('errors when no operation flags are provided', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync(['node', 'test', 'b55c9c91384d452b81dbd1ef79372b75']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No update operations specified'),
    );
  });

  it('calls buildDatabaseUpdatePayload with parsed flags and calls updateDatabaseSchema', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--add-prop',
      'Priority:select:High,Low',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildDatabaseUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ addProps: ['Priority:select:High,Low'] }),
      expect.anything(),
    );
    expect(mockUpdateDatabaseSchema).toHaveBeenCalledWith(
      expect.anything(),
      'aabbccdd-1122-3344-5566-778899aabbcc',
      expect.anything(),
    );
  });

  it('passes remove-prop flag to buildDatabaseUpdatePayload', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--remove-prop',
      'Status',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildDatabaseUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ removeProps: ['Status'] }),
      expect.anything(),
    );
  });

  it('fetches schema and passes rename-prop flag to buildDatabaseUpdatePayload', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--rename-prop',
      'Status:State',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockFetchDatabaseSchema).toHaveBeenCalled();
    expect(mockBuildDatabaseUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ renameProps: ['Status:State'] }),
      expect.anything(),
    );
  });

  it('fetches schema and passes set-options flag to buildDatabaseUpdatePayload', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--set-options',
      'Status:Todo,In Progress,Done',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockFetchDatabaseSchema).toHaveBeenCalled();
    expect(mockBuildDatabaseUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ setOptions: ['Status:Todo,In Progress,Done'] }),
      expect.anything(),
    );
  });

  it('does not fetch schema when only add-prop and remove-prop are used', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--add-prop',
      'Score:number',
      '--remove-prop',
      'Tags',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockFetchDatabaseSchema).not.toHaveBeenCalled();
  });

  it('passes title flag to buildDatabaseUpdatePayload', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'New Title',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildDatabaseUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Title' }),
      expect.anything(),
    );
  });

  it('outputs JSON when global output mode is json', async () => {
    setOutputMode('json');

    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'New Title',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(
      expect.objectContaining({
        id: 'aabbccdd-1122-3344-5566-778899aabbcc',
      }),
    );
  });

  it('outputs URL by default (non-JSON mode)', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'New Title',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(stdoutSpy).toHaveBeenCalledWith('https://notion.so/db-123\n');
  });

  it('passes all flags to buildDatabaseUpdatePayload in one call', async () => {
    const cmd = dbUpdateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      'New Title',
      '--add-prop',
      'Score:number',
      '--remove-prop',
      'Tags',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildDatabaseUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Title',
        addProps: ['Score:number'],
        removeProps: ['Tags'],
      }),
      expect.anything(),
    );
  });
});
