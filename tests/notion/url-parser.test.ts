import { describe, expect, it } from 'vitest';
import { CliError } from '../../src/errors/cli-error.js';
import { ErrorCodes } from '../../src/errors/codes.js';
import { parseNotionId, toUuid } from '../../src/notion/url-parser.js';

const SAMPLE_ID = 'b55c9c91384d452b81dbd1ef79372b75';
const SAMPLE_UUID = 'b55c9c91-384d-452b-81db-d1ef79372b75';

describe('parseNotionId', () => {
  describe('32-char hex IDs', () => {
    it('passes through a raw 32-char hex ID unchanged', () => {
      expect(parseNotionId(SAMPLE_ID)).toBe(SAMPLE_ID);
    });

    it('handles lowercase hex ID', () => {
      expect(parseNotionId('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      );
    });
  });

  describe('UUID with dashes', () => {
    it('strips dashes from UUID format', () => {
      expect(parseNotionId(SAMPLE_UUID)).toBe(SAMPLE_ID);
    });

    it('handles lowercase UUID', () => {
      expect(parseNotionId('a1b2c3d4-e5f6-a1b2-c3d4-e5f6a1b2c3d4')).toBe(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      );
    });
  });

  describe('notion.so URLs', () => {
    it('parses notion.so URL with workspace and page title', () => {
      expect(
        parseNotionId(
          `https://www.notion.so/workspace/Page-Title-${SAMPLE_ID}`,
        ),
      ).toBe(SAMPLE_ID);
    });

    it('parses bare notion.so URL with just the ID', () => {
      expect(parseNotionId(`https://www.notion.so/${SAMPLE_ID}`)).toBe(
        SAMPLE_ID,
      );
    });

    it('parses notion.so URL with query parameters', () => {
      expect(
        parseNotionId(`https://www.notion.so/workspace/${SAMPLE_ID}?v=abc123`),
      ).toBe(SAMPLE_ID);
    });

    it('parses notion.so URL without www', () => {
      expect(parseNotionId(`https://notion.so/Page-Title-${SAMPLE_ID}`)).toBe(
        SAMPLE_ID,
      );
    });

    it('parses notion.so URL with query params and fragment', () => {
      expect(
        parseNotionId(
          `https://www.notion.so/workspace/123abc-${SAMPLE_ID}?v=def#section`,
        ),
      ).toBe(SAMPLE_ID);
    });
  });

  describe('notion.site URLs', () => {
    it('parses notion.site URL with subdomain', () => {
      expect(
        parseNotionId(`https://myworkspace.notion.site/Page-${SAMPLE_ID}`),
      ).toBe(SAMPLE_ID);
    });
  });

  describe('invalid inputs', () => {
    it('throws CliError with INVALID_ID for non-matching string', () => {
      expect(() => parseNotionId('not-a-valid-id')).toThrow(CliError);
    });

    it('throws CliError with INVALID_ID code for non-matching string', () => {
      try {
        parseNotionId('not-a-valid-id');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CliError);
        expect((err as CliError).code).toBe(ErrorCodes.INVALID_ID);
      }
    });

    it('throws CliError with INVALID_ID for empty string', () => {
      try {
        parseNotionId('');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CliError);
        expect((err as CliError).code).toBe(ErrorCodes.INVALID_ID);
      }
    });

    it('throws CliError with INVALID_ID for non-notion URL', () => {
      try {
        parseNotionId('https://google.com/something');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CliError);
        expect((err as CliError).code).toBe(ErrorCodes.INVALID_ID);
      }
    });

    it('includes actionable suggestion in the error', () => {
      try {
        parseNotionId('bad-input');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CliError);
        expect((err as CliError).suggestion).toBeTruthy();
      }
    });

    it('includes the original input in error message', () => {
      try {
        parseNotionId('bad-input');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CliError);
        expect((err as CliError).message).toContain('bad-input');
      }
    });
  });
});

describe('toUuid', () => {
  it('converts 32-char hex to UUID format', () => {
    expect(toUuid(SAMPLE_ID)).toBe(SAMPLE_UUID);
  });

  it('inserts dashes at correct positions (8-4-4-4-12)', () => {
    const id = '00000000111122223333444444444444';
    expect(toUuid(id)).toBe('00000000-1111-2222-3333-444444444444');
  });
});
