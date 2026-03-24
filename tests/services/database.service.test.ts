import type { Client } from '@notionhq/client';
import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError } from '../../src/errors/cli-error.js';
import {
  createDatabase,
  parsePropertyDefinition,
  parsePropertyDefinitions,
} from '../../src/services/database.service.js';

describe('parsePropertyDefinition', () => {
  it('parses "Name:title" into title config', () => {
    const result = parsePropertyDefinition('Name:title');
    expect(result).toEqual({ name: 'Name', config: { title: {} } });
  });

  it('parses "Notes:rich_text" into rich_text config', () => {
    const result = parsePropertyDefinition('Notes:rich_text');
    expect(result).toEqual({ name: 'Notes', config: { rich_text: {} } });
  });

  it('parses "Score:number" into number config', () => {
    const result = parsePropertyDefinition('Score:number');
    expect(result).toEqual({ name: 'Score', config: { number: {} } });
  });

  it('parses "Status:select:A,B,C" into select config with options', () => {
    const result = parsePropertyDefinition('Status:select:A,B,C');
    expect(result).toEqual({
      name: 'Status',
      config: {
        select: {
          options: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        },
      },
    });
  });

  it('parses "Tags:multi_select:bug,feature" into multi_select config', () => {
    const result = parsePropertyDefinition('Tags:multi_select:bug,feature');
    expect(result).toEqual({
      name: 'Tags',
      config: {
        multi_select: {
          options: [{ name: 'bug' }, { name: 'feature' }],
        },
      },
    });
  });

  it('parses "State:status:Not Started,In Progress,Done" into status config', () => {
    const result = parsePropertyDefinition(
      'State:status:Not Started,In Progress,Done',
    );
    expect(result).toEqual({
      name: 'State',
      config: {
        status: {
          options: [
            { name: 'Not Started' },
            { name: 'In Progress' },
            { name: 'Done' },
          ],
        },
      },
    });
  });

  it('parses "Due:date" into date config', () => {
    const result = parsePropertyDefinition('Due:date');
    expect(result).toEqual({ name: 'Due', config: { date: {} } });
  });

  it('parses "Done:checkbox" into checkbox config', () => {
    const result = parsePropertyDefinition('Done:checkbox');
    expect(result).toEqual({ name: 'Done', config: { checkbox: {} } });
  });

  it('parses "Link:url" into url config', () => {
    const result = parsePropertyDefinition('Link:url');
    expect(result).toEqual({ name: 'Link', config: { url: {} } });
  });

  it('parses "Email:email" into email config', () => {
    const result = parsePropertyDefinition('Email:email');
    expect(result).toEqual({ name: 'Email', config: { email: {} } });
  });

  it('parses "Phone:phone_number" into phone_number config', () => {
    const result = parsePropertyDefinition('Phone:phone_number');
    expect(result).toEqual({
      name: 'Phone',
      config: { phone_number: {} },
    });
  });

  it('parses "Assignee:people" into people config', () => {
    const result = parsePropertyDefinition('Assignee:people');
    expect(result).toEqual({ name: 'Assignee', config: { people: {} } });
  });

  it('parses "Attachments:files" into files config', () => {
    const result = parsePropertyDefinition('Attachments:files');
    expect(result).toEqual({
      name: 'Attachments',
      config: { files: {} },
    });
  });

  it('parses "Created:created_time" into created_time config', () => {
    const result = parsePropertyDefinition('Created:created_time');
    expect(result).toEqual({
      name: 'Created',
      config: { created_time: {} },
    });
  });

  it('parses "Modified:last_edited_time" into last_edited_time config', () => {
    const result = parsePropertyDefinition('Modified:last_edited_time');
    expect(result).toEqual({
      name: 'Modified',
      config: { last_edited_time: {} },
    });
  });

  it('throws CliError for empty string', () => {
    expect(() => parsePropertyDefinition('')).toThrow(CliError);
  });

  it('throws CliError for missing colon (no type)', () => {
    expect(() => parsePropertyDefinition('Name')).toThrow(CliError);
  });

  it('throws CliError for unsupported type "relation"', () => {
    expect(() => parsePropertyDefinition('Ref:relation')).toThrow(CliError);
    expect(() => parsePropertyDefinition('Ref:relation')).toThrow(
      /not supported/,
    );
  });

  it('throws CliError for unsupported type "rollup"', () => {
    expect(() => parsePropertyDefinition('Sum:rollup')).toThrow(CliError);
  });

  it('throws CliError for unsupported type "formula"', () => {
    expect(() => parsePropertyDefinition('Calc:formula')).toThrow(CliError);
  });

  it('throws CliError for unsupported type "unique_id"', () => {
    expect(() => parsePropertyDefinition('ID:unique_id')).toThrow(CliError);
  });

  it('throws CliError for unknown type', () => {
    expect(() => parsePropertyDefinition('Foo:unknown_type')).toThrow(CliError);
  });
});

describe('parsePropertyDefinitions', () => {
  it('parses multiple definitions', () => {
    const result = parsePropertyDefinitions([
      'Name:title',
      'Status:select:A,B',
      'Done:checkbox',
    ]);
    expect(result).toEqual({
      Name: { title: {} },
      Status: { select: { options: [{ name: 'A' }, { name: 'B' }] } },
      Done: { checkbox: {} },
    });
  });

  it('auto-adds "Name:title" when no title property is provided', () => {
    const result = parsePropertyDefinitions([
      'Status:select:A,B',
      'Done:checkbox',
    ]);
    expect(result).toHaveProperty('Name');
    expect(result.Name).toEqual({ title: {} });
  });

  it('does not auto-add title when one is already provided', () => {
    const result = parsePropertyDefinitions(['Task:title', 'Done:checkbox']);
    expect(result).toHaveProperty('Task');
    expect(result).not.toHaveProperty('Name');
  });

  it('handles empty array by returning just the auto-added title', () => {
    const result = parsePropertyDefinitions([]);
    expect(result).toEqual({ Name: { title: {} } });
  });

  it('throws CliError for duplicate property names', () => {
    expect(() =>
      parsePropertyDefinitions(['Name:title', 'Name:rich_text']),
    ).toThrow(CliError);
  });

  it('throws CliError for multiple title properties', () => {
    expect(() =>
      parsePropertyDefinitions(['Name:title', 'Title:title']),
    ).toThrow(CliError);
  });
});

describe('createDatabase', () => {
  let client: Client;

  beforeEach(() => {
    client = {
      databases: {
        create: vi.fn().mockResolvedValue({
          object: 'database',
          id: 'db-id-123',
          url: 'https://notion.so/db-123',
          title: [{ plain_text: 'Tasks' }],
        } as Partial<DatabaseObjectResponse>),
      },
    } as unknown as Client;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls client.databases.create with correct parameters', async () => {
    const properties = { Name: { title: {} }, Done: { checkbox: {} } };

    await createDatabase(client, 'parent-uuid', 'Tasks', properties);

    expect(client.databases.create).toHaveBeenCalledWith({
      parent: { type: 'page_id', page_id: 'parent-uuid' },
      title: [{ type: 'text', text: { content: 'Tasks' } }],
      initial_data_source: {
        properties: { Name: { title: {} }, Done: { checkbox: {} } },
      },
    });
  });

  it('returns the database response', async () => {
    const properties = { Name: { title: {} } };

    const result = await createDatabase(
      client,
      'parent-uuid',
      'Tasks',
      properties,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'db-id-123',
        url: 'https://notion.so/db-123',
      }),
    );
  });
});
