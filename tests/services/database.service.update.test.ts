import type { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';
import { CliError } from '../../src/errors/cli-error.js';
import {
  buildDatabaseUpdatePayload,
  updateDatabaseSchema,
} from '../../src/services/database.service.js';

// Minimal schema fixture used across tests
const SCHEMA = {
  id: 'ds-id',
  databaseId: 'db-id',
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
};

describe('buildDatabaseUpdatePayload', () => {
  describe('--add-prop', () => {
    it('adds a simple property', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: ['Score:number'],
          removeProps: [],
          renameProps: [],
          setOptions: [],
        },
        SCHEMA,
      );
      expect(payload.properties).toEqual(
        expect.objectContaining({ Score: { number: {} } }),
      );
    });

    it('adds a select property with options', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: ['Priority:select:High,Low'],
          removeProps: [],
          renameProps: [],
          setOptions: [],
        },
        SCHEMA,
      );
      expect(payload.properties).toEqual(
        expect.objectContaining({
          Priority: {
            select: { options: [{ name: 'High' }, { name: 'Low' }] },
          },
        }),
      );
    });
  });

  describe('--remove-prop', () => {
    it('sets property to null', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: [],
          removeProps: ['Status'],
          renameProps: [],
          setOptions: [],
        },
        SCHEMA,
      );
      expect(payload.properties).toEqual(
        expect.objectContaining({ Status: null }),
      );
    });
  });

  describe('--rename-prop', () => {
    it('uses property id as key with new name', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: [],
          removeProps: [],
          renameProps: ['Status:State'],
          setOptions: [],
        },
        SCHEMA,
      );
      expect(payload.properties).toEqual(
        expect.objectContaining({ 'status-id': { name: 'State' } }),
      );
    });

    it('throws CliError when property does not exist', () => {
      expect(() =>
        buildDatabaseUpdatePayload(
          {
            addProps: [],
            removeProps: [],
            renameProps: ['NonExistent:NewName'],
            setOptions: [],
          },
          SCHEMA,
        ),
      ).toThrow(CliError);
    });

    it('throws CliError for invalid rename format (missing colon)', () => {
      expect(() =>
        buildDatabaseUpdatePayload(
          {
            addProps: [],
            removeProps: [],
            renameProps: ['StatusOnly'],
            setOptions: [],
          },
          SCHEMA,
        ),
      ).toThrow(CliError);
    });
  });

  describe('--set-options', () => {
    it('replaces select options', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: [],
          removeProps: [],
          renameProps: [],
          setOptions: ['Status:Todo,In Progress,Done'],
        },
        SCHEMA,
      );
      expect(payload.properties).toEqual(
        expect.objectContaining({
          Status: {
            select: {
              options: [
                { name: 'Todo' },
                { name: 'In Progress' },
                { name: 'Done' },
              ],
            },
          },
        }),
      );
    });

    it('replaces multi_select options', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: [],
          removeProps: [],
          renameProps: [],
          setOptions: ['Tags:bug,feature'],
        },
        SCHEMA,
      );
      expect(payload.properties).toEqual(
        expect.objectContaining({
          Tags: {
            multi_select: {
              options: [{ name: 'bug' }, { name: 'feature' }],
            },
          },
        }),
      );
    });

    it('throws CliError when property does not exist', () => {
      expect(() =>
        buildDatabaseUpdatePayload(
          {
            addProps: [],
            removeProps: [],
            renameProps: [],
            setOptions: ['NonExistent:A,B'],
          },
          SCHEMA,
        ),
      ).toThrow(CliError);
    });

    it('throws CliError when property is not select or multi_select', () => {
      expect(() =>
        buildDatabaseUpdatePayload(
          {
            addProps: [],
            removeProps: [],
            renameProps: [],
            setOptions: ['Name:A,B'],
          },
          SCHEMA,
        ),
      ).toThrow(CliError);
    });

    it('throws CliError for invalid set-options format (missing colon)', () => {
      expect(() =>
        buildDatabaseUpdatePayload(
          {
            addProps: [],
            removeProps: [],
            renameProps: [],
            setOptions: ['StatusOnly'],
          },
          SCHEMA,
        ),
      ).toThrow(CliError);
    });
  });

  describe('--title', () => {
    it('sets title in payload', () => {
      const payload = buildDatabaseUpdatePayload(
        {
          addProps: [],
          removeProps: [],
          renameProps: [],
          setOptions: [],
          title: 'New Title',
        },
        SCHEMA,
      );
      expect(payload.title).toEqual([
        { type: 'text', text: { content: 'New Title' } },
      ]);
    });

    it('omits title when not provided', () => {
      const payload = buildDatabaseUpdatePayload(
        { addProps: [], removeProps: [], renameProps: [], setOptions: [] },
        SCHEMA,
      );
      expect(payload.title).toBeUndefined();
    });
  });

  it('merges multiple operations into one payload', () => {
    const payload = buildDatabaseUpdatePayload(
      {
        addProps: ['Score:number'],
        removeProps: ['Tags'],
        renameProps: ['Status:State'],
        setOptions: [],
        title: 'Updated DB',
      },
      SCHEMA,
    );
    expect(payload.title).toEqual([
      { type: 'text', text: { content: 'Updated DB' } },
    ]);
    expect(payload.properties).toEqual(
      expect.objectContaining({
        Score: { number: {} },
        Tags: null,
        'status-id': { name: 'State' },
      }),
    );
  });
});

describe('updateDatabaseSchema', () => {
  it('calls client.dataSources.update with the payload', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      object: 'data_source',
      id: 'ds-id',
      url: 'https://notion.so/db-123',
    });
    const client = {
      dataSources: { update: mockUpdate },
    } as unknown as Client;

    const payload = {
      title: [{ type: 'text' as const, text: { content: 'New' } }],
    };
    await updateDatabaseSchema(client, 'ds-id', payload);

    expect(mockUpdate).toHaveBeenCalledWith({
      data_source_id: 'ds-id',
      ...payload,
    });
  });

  it('returns the API response', async () => {
    const response = {
      object: 'data_source',
      id: 'ds-id',
      url: 'https://notion.so/db-123',
    };
    const client = {
      dataSources: { update: vi.fn().mockResolvedValue(response) },
    } as unknown as Client;

    const result = await updateDatabaseSchema(client, 'ds-id', {});
    expect(result).toEqual(response);
  });
});
