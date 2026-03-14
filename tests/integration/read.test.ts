import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';
import { duplicateFixture } from './helpers/fixture.js';

// Env vars are validated by the setup file (validate-env.ts) before tests run.
const RICH_PAGE_ID = String(process.env.NOTION_FIXTURE_RICH_PAGE_ID);
const EMPTY_PAGE_ID = String(process.env.NOTION_FIXTURE_EMPTY_PAGE_ID);
const SIMPLE_PAGE_ID = String(process.env.NOTION_FIXTURE_SIMPLE_PAGE_ID);

describe('read command', () => {
  it('reads a rich content page with markdown headings', async () => {
    const { id, cleanup } = await duplicateFixture(RICH_PAGE_ID);
    try {
      const result = await runCli(['read', id]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('#');
    } finally {
      await cleanup();
    }
  });

  it('reads an empty page with exit code 0', async () => {
    const { id, cleanup } = await duplicateFixture(EMPTY_PAGE_ID);
    try {
      const result = await runCli(['read', id]);

      expect(result.exitCode).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it('reads a page with --json flag and returns valid JSON', async () => {
    const { id, cleanup } = await duplicateFixture(SIMPLE_PAGE_ID);
    try {
      const result = await runCli(['--json', 'read', id]);

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    } finally {
      await cleanup();
    }
  });

  it('fails with non-zero exit code for an invalid page ID', async () => {
    const result = await runCli([
      'read',
      '00000000-0000-0000-0000-000000000000',
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).not.toBe('');
  });
});
