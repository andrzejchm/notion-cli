import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CliError } from '../../src/errors/cli-error.js';
import { ErrorCodes } from '../../src/errors/codes.js';
import {
  buildPropertiesPayload,
  buildPropertyUpdate,
  updatePageProperties,
} from '../../src/services/update.service.js';

// Minimal helper to build a fake PageObjectResponse with given properties
function makePage(props: Record<string, { type: string }>): PageObjectResponse {
  return {
    object: 'page',
    id: 'page-id',
    properties: props,
  } as unknown as PageObjectResponse;
}

function createMockClient() {
  return {
    pages: {
      retrieve: vi.fn().mockResolvedValue(makePage({})),
      update: vi.fn().mockResolvedValue({ object: 'page', id: 'page-id' }),
    },
  } as unknown as Client;
}

// ──────────────────────────────────────────────────────────────────────────────
// buildPropertyUpdate
// ──────────────────────────────────────────────────────────────────────────────

describe('buildPropertyUpdate', () => {
  it('builds title payload', () => {
    expect(buildPropertyUpdate('Title', 'title', 'Hello')).toEqual({
      title: [{ type: 'text', text: { content: 'Hello' } }],
    });
  });

  it('builds rich_text payload', () => {
    expect(buildPropertyUpdate('Notes', 'rich_text', 'Some text')).toEqual({
      rich_text: [{ type: 'text', text: { content: 'Some text' } }],
    });
  });

  it('builds select payload', () => {
    expect(buildPropertyUpdate('Status', 'select', 'In Progress')).toEqual({
      select: { name: 'In Progress' },
    });
  });

  it('builds status payload', () => {
    expect(buildPropertyUpdate('Status', 'status', 'Done')).toEqual({
      status: { name: 'Done' },
    });
  });

  it('builds multi_select payload from comma-separated values', () => {
    expect(buildPropertyUpdate('Tags', 'multi_select', 'a, b, c')).toEqual({
      multi_select: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    });
  });

  it('builds multi_select payload from a single value', () => {
    expect(buildPropertyUpdate('Tags', 'multi_select', 'solo')).toEqual({
      multi_select: [{ name: 'solo' }],
    });
  });

  it('filters empty items from multi_select', () => {
    expect(buildPropertyUpdate('Tags', 'multi_select', 'a,,b,')).toEqual({
      multi_select: [{ name: 'a' }, { name: 'b' }],
    });
  });

  it('builds number payload', () => {
    expect(buildPropertyUpdate('Count', 'number', '42')).toEqual({
      number: 42,
    });
  });

  it('throws CliError with INVALID_ARG for non-numeric number value', () => {
    try {
      buildPropertyUpdate('Count', 'number', 'abc');
      expect.fail('Expected CliError');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).code).toBe(ErrorCodes.INVALID_ARG);
      expect((err as CliError).message).toContain('abc');
    }
  });

  it('builds checkbox payload for "true"', () => {
    expect(buildPropertyUpdate('Done', 'checkbox', 'true')).toEqual({
      checkbox: true,
    });
  });

  it('builds checkbox payload for "yes"', () => {
    expect(buildPropertyUpdate('Done', 'checkbox', 'yes')).toEqual({
      checkbox: true,
    });
  });

  it('builds checkbox payload for "false"', () => {
    expect(buildPropertyUpdate('Done', 'checkbox', 'false')).toEqual({
      checkbox: false,
    });
  });

  it('builds checkbox payload for "no"', () => {
    expect(buildPropertyUpdate('Done', 'checkbox', 'no')).toEqual({
      checkbox: false,
    });
  });

  it('builds checkbox payload for "True" (case-insensitive)', () => {
    expect(buildPropertyUpdate('Done', 'checkbox', 'True')).toEqual({
      checkbox: true,
    });
  });

  it('builds checkbox payload for "YES" (case-insensitive)', () => {
    expect(buildPropertyUpdate('Done', 'checkbox', 'YES')).toEqual({
      checkbox: true,
    });
  });

  it('builds url payload', () => {
    expect(buildPropertyUpdate('Link', 'url', 'https://example.com')).toEqual({
      url: 'https://example.com',
    });
  });

  it('builds email payload', () => {
    expect(buildPropertyUpdate('Email', 'email', 'foo@bar.com')).toEqual({
      email: 'foo@bar.com',
    });
  });

  it('builds phone_number payload', () => {
    expect(buildPropertyUpdate('Phone', 'phone_number', '+1 555-1234')).toEqual(
      { phone_number: '+1 555-1234' },
    );
  });

  it('builds date payload from ISO date only (start)', () => {
    expect(buildPropertyUpdate('Due', 'date', '2024-12-25')).toEqual({
      date: { start: '2024-12-25' },
    });
  });

  it('builds date payload with start and end', () => {
    expect(
      buildPropertyUpdate('Range', 'date', '2024-01-01,2024-01-31'),
    ).toEqual({
      date: { start: '2024-01-01', end: '2024-01-31' },
    });
  });

  it('returns null for title when value is empty string (clear)', () => {
    expect(buildPropertyUpdate('Title', 'title', '')).toBeNull();
  });

  it('returns null for select when value is empty string (clear)', () => {
    expect(buildPropertyUpdate('Status', 'select', '')).toBeNull();
  });

  it('returns null for status when value is empty string (clear)', () => {
    expect(buildPropertyUpdate('Status', 'status', '')).toBeNull();
  });

  it('returns null for number when value is empty string (clear)', () => {
    expect(buildPropertyUpdate('Count', 'number', '')).toBeNull();
  });

  it('returns null for date when value is empty string (clear)', () => {
    expect(buildPropertyUpdate('Due', 'date', '')).toBeNull();
  });

  it('throws CliError with INVALID_ARG for unsupported type "relation"', () => {
    try {
      buildPropertyUpdate('Related', 'relation', 'some-id');
      expect.fail('Expected CliError');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).code).toBe(ErrorCodes.INVALID_ARG);
    }
  });

  it('throws CliError with INVALID_ARG for unsupported type "formula"', () => {
    expect(() => buildPropertyUpdate('Formula', 'formula', 'value')).toThrow(
      CliError,
    );
  });

  it('throws CliError with INVALID_ARG for unsupported type "rollup"', () => {
    expect(() => buildPropertyUpdate('Rollup', 'rollup', 'value')).toThrow(
      CliError,
    );
  });

  it('throws CliError with INVALID_ARG for unsupported type "created_time"', () => {
    expect(() =>
      buildPropertyUpdate('Created', 'created_time', 'value'),
    ).toThrow(CliError);
  });

  it('throws CliError with INVALID_ARG for unsupported type "last_edited_time"', () => {
    expect(() =>
      buildPropertyUpdate('Edited', 'last_edited_time', 'value'),
    ).toThrow(CliError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildPropertiesPayload
// ──────────────────────────────────────────────────────────────────────────────

describe('buildPropertiesPayload', () => {
  it('parses a single title prop string', () => {
    const page = makePage({ Name: { type: 'title' } });
    const result = buildPropertiesPayload(['Name=Hello'], page);
    expect(result).toEqual({
      Name: { title: [{ type: 'text', text: { content: 'Hello' } }] },
    });
  });

  it('parses multiple prop strings of different types', () => {
    const page = makePage({
      Name: { type: 'title' },
      Status: { type: 'select' },
      Count: { type: 'number' },
    });
    const result = buildPropertiesPayload(
      ['Name=My Page', 'Status=Done', 'Count=3'],
      page,
    );
    expect(result).toEqual({
      Name: { title: [{ type: 'text', text: { content: 'My Page' } }] },
      Status: { select: { name: 'Done' } },
      Count: { number: 3 },
    });
  });

  it('supports values with "=" in them (splits on first "=" only)', () => {
    const page = makePage({ Link: { type: 'url' } });
    const result = buildPropertiesPayload(
      ['Link=https://example.com?foo=bar'],
      page,
    );
    expect(result).toEqual({
      Link: { url: 'https://example.com?foo=bar' },
    });
  });

  it('sets property to null when value is empty string (clear)', () => {
    const page = makePage({ Status: { type: 'select' } });
    const result = buildPropertiesPayload(['Status='], page);
    expect(result).toEqual({ Status: null });
  });

  it('throws CliError when property name is not found in page schema', () => {
    const page = makePage({ Name: { type: 'title' } });
    try {
      buildPropertiesPayload(['UnknownProp=Value'], page);
      expect.fail('Expected CliError');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).code).toBe(ErrorCodes.INVALID_ARG);
    }
  });

  it('throws CliError when prop string has no "=" separator', () => {
    const page = makePage({ Name: { type: 'title' } });
    expect(() => buildPropertiesPayload(['NoEqualsSign'], page)).toThrow(
      CliError,
    );
  });

  it('throws CliError for unsupported property type', () => {
    const page = makePage({ Related: { type: 'relation' } });
    expect(() => buildPropertiesPayload(['Related=some-id'], page)).toThrow(
      CliError,
    );
  });

  it('trims whitespace from property name before matching schema', () => {
    const page = makePage({ Status: { type: 'select' } });
    const result = buildPropertiesPayload([' Status = Done'], page);
    expect(result).toEqual({
      Status: { select: { name: ' Done' } },
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// updatePageProperties
// ──────────────────────────────────────────────────────────────────────────────

describe('updatePageProperties', () => {
  let client: Client;

  beforeEach(() => {
    client = createMockClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls client.pages.update with the given page_id and properties', async () => {
    const props = {
      Name: { title: [{ type: 'text', text: { content: 'Hello' } }] },
    };
    await updatePageProperties(client, 'page-id', props);

    expect(client.pages.update).toHaveBeenCalledWith({
      page_id: 'page-id',
      properties: props,
    });
  });

  it('returns the PageObjectResponse from the API', async () => {
    const mockPage = {
      object: 'page',
      id: 'page-id',
    } as unknown as PageObjectResponse;
    vi.mocked(client.pages.update).mockResolvedValue(mockPage as never);

    const result = await updatePageProperties(client, 'page-id', {});

    expect(result).toBe(mockPage);
  });
});
