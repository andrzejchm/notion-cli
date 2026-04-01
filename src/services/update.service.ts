import { existsSync } from 'node:fs';
import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { uploadFile } from './upload.service.js';

const UNSUPPORTED_TYPES = new Set([
  'relation',
  'formula',
  'rollup',
  'created_time',
  'created_by',
  'last_edited_time',
  'last_edited_by',
  'unique_id',
  'verification',
  'button',
]);

/**
 * Builds the Notion API property update object for a single property.
 * Returns null when value is empty string (signals "clear the property").
 * Throws CliError(INVALID_ARG) for unsupported property types.
 *
 * For `files` type, pass a Client instance to enable local file uploads.
 */
export function buildPropertyUpdate(
  propName: string,
  propType: string,
  value: string,
): Record<string, unknown> | null {
  if (UNSUPPORTED_TYPES.has(propType)) {
    throw new CliError(
      ErrorCodes.INVALID_ARG,
      `Property "${propName}" has type "${propType}" which cannot be set via the CLI.`,
      'Supported types: title, rich_text, select, status, multi_select, number, checkbox, url, email, phone_number, date, files',
    );
  }

  // Empty value → clear the property (null)
  if (value === '') {
    return null;
  }

  switch (propType) {
    case 'title':
      return { title: [{ type: 'text', text: { content: value } }] };

    case 'rich_text':
      return { rich_text: [{ type: 'text', text: { content: value } }] };

    case 'select':
      return { select: { name: value } };

    case 'status':
      return { status: { name: value } };

    case 'multi_select':
      return {
        multi_select: value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => ({ name: v })),
      };

    case 'number': {
      const n = Number(value);
      if (Number.isNaN(n)) {
        throw new CliError(
          ErrorCodes.INVALID_ARG,
          `Invalid number value "${value}" for property "${propName}".`,
          'Provide a numeric value, e.g. --prop "Count=42"',
        );
      }
      return { number: n };
    }

    case 'checkbox': {
      const lower = value.toLowerCase();
      return { checkbox: lower === 'true' || lower === 'yes' };
    }

    case 'url':
      return { url: value };

    case 'email':
      return { email: value };

    case 'phone_number':
      return { phone_number: value };

    case 'date': {
      const parts = value.split(',');
      const start = parts[0].trim();
      const end = parts[1]?.trim();
      return { date: end ? { start, end } : { start } };
    }

    case 'files':
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Property "${propName}" has type "files" which requires async upload — use buildPropertiesPayloadAsync instead.`,
        'Use buildPropertiesPayloadAsync with a Notion client to handle file uploads',
      );

    default:
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Property "${propName}" has unsupported type "${propType}".`,
        'Supported types: title, rich_text, select, status, multi_select, number, checkbox, url, email, phone_number, date, files',
      );
  }
}

/**
 * Builds the Notion API property value for a `files` property.
 * Supports:
 * - Local file paths (uploads via Notion file upload API)
 * - External URLs (http:// or https://)
 * - Comma-separated values for multiple files
 */
async function buildFilesPropertyValue(
  client: Client,
  propName: string,
  value: string,
): Promise<Record<string, unknown>> {
  const entries = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const fileItems = await Promise.all(
    entries.map(async (entry) => {
      if (/^https?:\/\//i.test(entry)) {
        // External URL
        const name = entry.split('/').pop() ?? entry;
        return { type: 'external', external: { url: entry }, name };
      }

      if (existsSync(entry)) {
        // Local file — upload it
        const result = await uploadFile(client, entry);
        return {
          type: 'file_upload',
          file_upload: { id: result.fileUploadId },
          name: result.filename,
        };
      }

      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `File not found and not a URL: "${entry}" for property "${propName}".`,
        'Provide a valid local file path or an http(s):// URL',
      );
    }),
  );

  return { files: fileItems };
}

/** A minimal property schema entry — just needs a `type` field. */
export interface PropertySchema {
  type: string;
}

/**
 * Normalizes a schemaOrPage argument into a plain property schema map.
 */
function normalizeSchema(
  schemaOrPage: Record<string, PropertySchema> | PageObjectResponse,
): Record<string, PropertySchema> {
  const isPage =
    'object' in schemaOrPage &&
    (schemaOrPage as PageObjectResponse).object === 'page';
  return isPage
    ? ((schemaOrPage as PageObjectResponse).properties as Record<
        string,
        PropertySchema
      >)
    : (schemaOrPage as Record<string, PropertySchema>);
}

/**
 * Parses a single `--prop "Name=Value"` string and returns [propName, value].
 * Throws CliError(INVALID_ARG) when the string has no "=" separator.
 */
function parsePropString(propString: string): [string, string] {
  const eqIdx = propString.indexOf('=');
  if (eqIdx === -1) {
    throw new CliError(
      ErrorCodes.INVALID_ARG,
      `Invalid --prop value: "${propString}". Expected format: "PropertyName=Value".`,
      'Example: --prop "Status=Done"',
    );
  }
  return [propString.slice(0, eqIdx).trim(), propString.slice(eqIdx + 1)];
}

/**
 * Looks up a property in the schema, throwing CliError if not found.
 */
function lookupSchemaProp(
  propName: string,
  schema: Record<string, PropertySchema>,
): PropertySchema {
  const schemaProp = schema[propName];
  if (!schemaProp) {
    const available = Object.keys(schema).join(', ');
    throw new CliError(
      ErrorCodes.INVALID_ARG,
      `Property "${propName}" not found on this page.`,
      `Available properties: ${available}`,
    );
  }
  return schemaProp;
}

/**
 * Parses all `--prop "Name=Value"` strings against a property schema
 * and returns a Notion API `properties` object ready for pages.update() or pages.create().
 *
 * Accepts either a PageObjectResponse (for backward compat) or a plain schema map.
 *
 * Throws CliError(INVALID_ARG) when:
 * - a prop string has no "=" separator
 * - the property name is not found in the schema
 * - the property type is unsupported
 * - the property type is `files` (use buildPropertiesPayloadAsync instead)
 */
export function buildPropertiesPayload(
  propStrings: string[],
  schemaOrPage: Record<string, PropertySchema> | PageObjectResponse,
): Record<string, unknown> {
  const schema = normalizeSchema(schemaOrPage);
  const result: Record<string, unknown> = {};

  for (const propString of propStrings) {
    const [propName, value] = parsePropString(propString);
    const schemaProp = lookupSchemaProp(propName, schema);
    result[propName] = buildPropertyUpdate(propName, schemaProp.type, value);
  }

  return result;
}

/**
 * Async version of buildPropertiesPayload that also handles `files` properties.
 * For `files` type, local file paths are uploaded via the Notion file upload API.
 * External URLs (http/https) are used as-is.
 *
 * Requires a Notion Client instance for file uploads.
 */
export async function buildPropertiesPayloadAsync(
  client: Client,
  propStrings: string[],
  schemaOrPage: Record<string, PropertySchema> | PageObjectResponse,
): Promise<Record<string, unknown>> {
  const schema = normalizeSchema(schemaOrPage);
  const result: Record<string, unknown> = {};

  for (const propString of propStrings) {
    const [propName, value] = parsePropString(propString);
    const schemaProp = lookupSchemaProp(propName, schema);

    if (schemaProp.type === 'files') {
      result[propName] =
        value === ''
          ? null
          : await buildFilesPropertyValue(client, propName, value);
    } else {
      result[propName] = buildPropertyUpdate(propName, schemaProp.type, value);
    }
  }

  return result;
}

/**
 * Calls the Notion API to update a page's properties.
 * Returns the full updated PageObjectResponse.
 */
export async function updatePageProperties(
  client: Client,
  pageId: string,
  properties: Record<string, unknown>,
): Promise<PageObjectResponse> {
  const response = await client.pages.update({
    page_id: pageId,
    properties: properties as Parameters<
      typeof client.pages.update
    >[0]['properties'],
  });
  return response as PageObjectResponse;
}
