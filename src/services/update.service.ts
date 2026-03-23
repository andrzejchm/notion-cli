import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';

const UNSUPPORTED_TYPES = new Set([
  'relation',
  'formula',
  'rollup',
  'created_time',
  'created_by',
  'last_edited_time',
  'last_edited_by',
  'files',
  'unique_id',
  'verification',
  'button',
]);

/**
 * Builds the Notion API property update object for a single property.
 * Returns null when value is empty string (signals "clear the property").
 * Throws CliError(INVALID_ARG) for unsupported property types.
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
      'Supported types: title, rich_text, select, status, multi_select, number, checkbox, url, email, phone_number, date',
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

    default:
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Property "${propName}" has unsupported type "${propType}".`,
        'Supported types: title, rich_text, select, status, multi_select, number, checkbox, url, email, phone_number, date',
      );
  }
}

/**
 * Parses all `--prop "Name=Value"` strings against the page property schema
 * and returns a Notion API `properties` object ready for pages.update().
 *
 * Throws CliError(INVALID_ARG) when:
 * - a prop string has no "=" separator
 * - the property name is not found in the page schema
 * - the property type is unsupported
 */
export function buildPropertiesPayload(
  propStrings: string[],
  page: PageObjectResponse,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const propString of propStrings) {
    const eqIdx = propString.indexOf('=');
    if (eqIdx === -1) {
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Invalid --prop value: "${propString}". Expected format: "PropertyName=Value".`,
        'Example: --prop "Status=Done"',
      );
    }

    const propName = propString.slice(0, eqIdx).trim();
    const value = propString.slice(eqIdx + 1);

    const schemaProp = page.properties[propName];
    if (!schemaProp) {
      const available = Object.keys(page.properties).join(', ');
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Property "${propName}" not found on this page.`,
        `Available properties: ${available}`,
      );
    }

    const propType = schemaProp.type;
    const payload = buildPropertyUpdate(propName, propType, value);
    result[propName] = payload;
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
