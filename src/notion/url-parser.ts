import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';

/** Matches a raw 32-character hex ID (no dashes) */
const NOTION_ID_REGEX = /^[0-9a-f]{32}$/i;

/** Matches a UUID with dashes (8-4-4-4-12) */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Matches a 32-char hex ID embedded in a Notion URL path.
 * Handles notion.so and notion.site domains, with optional workspace, page title,
 * query parameters, and fragments.
 * Uses lazy matching to find the first 32-char hex ID in the path.
 */
const NOTION_URL_REGEX =
  /https?:\/\/(?:[a-zA-Z0-9-]+\.)?notion\.(?:so|site)\/.*?([0-9a-f]{32})(?:[?#]|$)/i;

function throwInvalidId(input: string): never {
  throw new CliError(
    ErrorCodes.INVALID_ID,
    `Cannot parse Notion ID from: ${input}`,
    'Provide a valid Notion URL or page/database ID',
  );
}

/**
 * Parse any Notion URL or ID string into the normalized 32-char hex format.
 *
 * Accepts:
 * - Raw 32-char hex IDs (pass-through)
 * - UUIDs with dashes (strips dashes)
 * - notion.so and notion.site URLs with embedded 32-char hex IDs
 *
 * @throws {CliError} with code INVALID_ID if the input cannot be parsed
 */
export function parseNotionId(input: string): string {
  if (!input) throwInvalidId(input);

  // 1. Raw 32-char hex ID — pass through
  if (NOTION_ID_REGEX.test(input)) {
    return input.toLowerCase();
  }

  // 2. UUID with dashes — strip dashes
  if (UUID_REGEX.test(input)) {
    return input.replace(/-/g, '').toLowerCase();
  }

  // 3. Notion URL — extract embedded 32-char hex ID
  const urlMatch = NOTION_URL_REGEX.exec(input);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  throwInvalidId(input);
}

/**
 * Convert a 32-char hex Notion ID to standard UUID format (8-4-4-4-12 with dashes).
 */
export function toUuid(id: string): string {
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
