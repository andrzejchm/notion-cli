import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';
import { duplicateFixture } from './helpers/fixture.js';

const SIMPLE_PAGE_ID = String(process.env.NOTION_FIXTURE_SIMPLE_PAGE_ID);

describe('comment (add) command', () => {
  it('adds a comment to a page with exit code 0', async () => {
    const { id, cleanup } = await duplicateFixture(SIMPLE_PAGE_ID);
    try {
      const result = await runCli([
        'comment',
        id,
        '-m',
        'integration test comment',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Comment added');
    } finally {
      await cleanup();
    }
  });

  it('added comment appears when listing comments', async () => {
    const { id, cleanup } = await duplicateFixture(SIMPLE_PAGE_ID);
    try {
      const uniqueText = `test-comment-${Date.now()}`;
      await runCli(['comment', id, '-m', uniqueText]);

      const listResult = await runCli(['comments', id]);

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain(uniqueText);
    } finally {
      await cleanup();
    }
  });
});
