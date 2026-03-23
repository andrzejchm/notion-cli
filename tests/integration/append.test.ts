import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';
import { duplicateFixture } from './helpers/fixture.js';

const SIMPLE_PAGE_ID = String(process.env.NOTION_FIXTURE_SIMPLE_PAGE_ID);

describe('append command', () => {
  it('appends text to a page with exit code 0', async () => {
    const { id, cleanup } = await duplicateFixture(SIMPLE_PAGE_ID);
    try {
      const result = await runCli(['append', id, '-m', '## Appended Heading']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Appended');
    } finally {
      await cleanup();
    }
  });

  it('appended text appears when reading the page back', async () => {
    const { id, cleanup } = await duplicateFixture(SIMPLE_PAGE_ID);
    try {
      const uniqueMarker = `integration-test-${Date.now()}`;
      await runCli(['append', id, '-m', uniqueMarker]);

      const readResult = await runCli(['read', id]);

      expect(readResult.exitCode).toBe(0);
      expect(readResult.stdout).toContain(uniqueMarker);
    } finally {
      await cleanup();
    }
  });
});
