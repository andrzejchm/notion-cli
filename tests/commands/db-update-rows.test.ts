import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted runs before module-level variable declarations, so all data
// used inside must be defined inline within the hoisted callback.
const {
  mockResolveDataSourceId,
  mockFetchDatabaseSchema,
  mockQueryDatabase,
  mockBuildFilter,
} = vi.hoisted(() => {
  const schema = {
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
    },
  };

  const entries = [
    {
      id: 'page-id-1',
      properties: { Name: 'Row One', Status: 'Todo' },
      raw: {
        object: 'page',
        id: 'page-id-1',
        properties: {
          Name: { type: 'title', title: [{ plain_text: 'Row One' }] },
          Status: { type: 'select', select: { name: 'Todo' } },
        },
      },
    },
    {
      id: 'page-id-2',
      properties: { Name: 'Row Two', Status: 'Todo' },
      raw: {
        object: 'page',
        id: 'page-id-2',
        properties: {
          Name: { type: 'title', title: [{ plain_text: 'Row Two' }] },
          Status: { type: 'select', select: { name: 'Todo' } },
        },
      },
    },
  ];

  return {
    mockResolveDataSourceId: vi
      .fn()
      .mockResolvedValue('aabbccdd-1122-3344-5566-778899aabbcc'),
    mockFetchDatabaseSchema: vi.fn().mockResolvedValue(schema),
    mockQueryDatabase: vi.fn().mockResolvedValue(entries),
    mockBuildFilter: vi
      .fn()
      .mockReturnValue({ property: 'Status', select: { equals: 'Todo' } }),
  };
});

const { mockBuildPropertiesPayload, mockUpdatePageProperties } = vi.hoisted(
  () => ({
    mockBuildPropertiesPayload: vi
      .fn()
      .mockReturnValue({ Status: { select: { name: 'Done' } } }),
    mockUpdatePageProperties: vi.fn().mockResolvedValue({
      object: 'page',
      id: 'page-id-1',
    }),
  }),
);

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'test-token', source: 'env' }),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({})),
}));

vi.mock('../../src/services/database.service.js', () => ({
  resolveDataSourceId: mockResolveDataSourceId,
  fetchDatabaseSchema: mockFetchDatabaseSchema,
  queryDatabase: mockQueryDatabase,
  buildFilter: mockBuildFilter,
}));

vi.mock('../../src/services/update.service.js', () => ({
  buildPropertiesPayload: mockBuildPropertiesPayload,
  updatePageProperties: mockUpdatePageProperties,
}));

import { dbUpdateRowsCommand } from '../../src/commands/db/update-rows.js';
import { setOutputMode } from '../../src/output/format.js';

const DB_ID = 'aabbccdd-1122-3344-5566-778899aabbcc';

const mockSchema = {
  id: DB_ID,
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
  },
};

describe('dbUpdateRowsCommand', () => {
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

    // Restore default mock return values after vi.clearAllMocks()
    mockResolveDataSourceId.mockResolvedValue(DB_ID);
    mockFetchDatabaseSchema.mockResolvedValue(mockSchema);
    mockQueryDatabase.mockResolvedValue([
      {
        id: 'page-id-1',
        properties: { Name: 'Row One', Status: 'Todo' },
        raw: {
          object: 'page',
          id: 'page-id-1',
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'Row One' }] },
            Status: { type: 'select', select: { name: 'Todo' } },
          },
        },
      },
      {
        id: 'page-id-2',
        properties: { Name: 'Row Two', Status: 'Todo' },
        raw: {
          object: 'page',
          id: 'page-id-2',
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'Row Two' }] },
            Status: { type: 'select', select: { name: 'Todo' } },
          },
        },
      },
    ]);
    mockBuildFilter.mockReturnValue({
      property: 'Status',
      select: { equals: 'Todo' },
    });
    mockBuildPropertiesPayload.mockReturnValue({
      Status: { select: { name: 'Done' } },
    });
    mockUpdatePageProperties.mockResolvedValue({
      object: 'page',
      id: 'page-id-1',
    });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('errors when no --prop is provided', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync(['node', 'test', DB_ID]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No properties to update'),
    );
  });

  it('resolves data source, fetches schema, queries and updates all rows', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync(['node', 'test', DB_ID, '--prop', 'Status=Done']);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockResolveDataSourceId).toHaveBeenCalledWith(
      expect.anything(),
      DB_ID,
    );
    expect(mockFetchDatabaseSchema).toHaveBeenCalledWith(
      expect.anything(),
      DB_ID,
    );
    expect(mockQueryDatabase).toHaveBeenCalledWith(
      expect.anything(),
      DB_ID,
      expect.objectContaining({ filter: undefined }),
    );
    expect(mockBuildPropertiesPayload).toHaveBeenCalledTimes(2);
    expect(mockUpdatePageProperties).toHaveBeenCalledTimes(2);
  });

  it('applies filter when --filter is provided', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync([
      'node',
      'test',
      DB_ID,
      '--filter',
      'Status=Todo',
      '--prop',
      'Status=Done',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildFilter).toHaveBeenCalledWith(['Status=Todo'], mockSchema);
    expect(mockQueryDatabase).toHaveBeenCalledWith(
      expect.anything(),
      DB_ID,
      expect.objectContaining({ filter: expect.anything() }),
    );
  });

  it('outputs "Updated X rows" in human mode', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync(['node', 'test', DB_ID, '--prop', 'Status=Done']);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(stdoutSpy).toHaveBeenCalledWith('Updated 2 row(s).\n');
  });

  it('outputs JSON array of results when --json mode is active', async () => {
    setOutputMode('json');

    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync(['node', 'test', DB_ID, '--prop', 'Status=Done']);

    expect(exitSpy).not.toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ id: 'page-id-1', success: true });
    expect(parsed[1]).toMatchObject({ id: 'page-id-2', success: true });
  });

  it('shows dry-run message on stderr and row IDs on stdout without updating', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync([
      'node',
      'test',
      DB_ID,
      '--prop',
      'Status=Done',
      '--dry-run',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockUpdatePageProperties).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dry run: would update 2 row(s)'),
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('page-id-1'),
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('page-id-2'),
    );
  });

  it('warns on stderr when no filter and more than 10 rows would be updated', async () => {
    const manyEntries = Array.from({ length: 11 }, (_, i) => ({
      id: `page-id-${i}`,
      properties: { Name: `Row ${i}` },
      raw: {
        object: 'page',
        id: `page-id-${i}`,
        properties: {
          Name: { type: 'title', title: [{ plain_text: `Row ${i}` }] },
        },
      },
    }));
    mockQueryDatabase.mockResolvedValueOnce(manyEntries);

    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync(['node', 'test', DB_ID, '--prop', 'Status=Done']);

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('11 rows will be updated'),
    );
  });

  it('does not warn when filter is provided even with many rows', async () => {
    const manyEntries = Array.from({ length: 11 }, (_, i) => ({
      id: `page-id-${i}`,
      properties: { Name: `Row ${i}` },
      raw: {
        object: 'page',
        id: `page-id-${i}`,
        properties: {
          Name: { type: 'title', title: [{ plain_text: `Row ${i}` }] },
        },
      },
    }));
    mockQueryDatabase.mockResolvedValueOnce(manyEntries);

    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync([
      'node',
      'test',
      DB_ID,
      '--filter',
      'Status=Todo',
      '--prop',
      'Status=Done',
    ]);

    const warnCalls = (stderrSpy.mock.calls as string[][]).filter(([msg]) =>
      msg.includes('rows will be updated'),
    );
    expect(warnCalls).toHaveLength(0);
  });

  it('reports failures on stderr and still outputs success count', async () => {
    mockUpdatePageProperties
      .mockResolvedValueOnce({ object: 'page', id: 'page-id-1' })
      .mockRejectedValueOnce(new Error('API error'));

    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync(['node', 'test', DB_ID, '--prop', 'Status=Done']);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(stdoutSpy).toHaveBeenCalledWith('Updated 1 row(s).\n');
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 row(s) failed to update'),
    );
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('API error'),
    );
  });

  it('supports multiple --prop flags', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync([
      'node',
      'test',
      DB_ID,
      '--prop',
      'Status=Done',
      '--prop',
      'Name=Updated',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildPropertiesPayload).toHaveBeenCalledWith(
      ['Status=Done', 'Name=Updated'],
      expect.anything(),
    );
  });

  it('supports multiple --filter flags', async () => {
    const cmd = dbUpdateRowsCommand();
    await cmd.parseAsync([
      'node',
      'test',
      DB_ID,
      '--filter',
      'Status=Todo',
      '--filter',
      'Name=Row One',
      '--prop',
      'Status=Done',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(mockBuildFilter).toHaveBeenCalledWith(
      ['Status=Todo', 'Name=Row One'],
      mockSchema,
    );
  });
});
