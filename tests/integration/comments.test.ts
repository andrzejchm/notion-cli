import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';

const COMMENTS_PAGE_ID = String(process.env.NOTION_FIXTURE_COMMENTS_PAGE_ID);

describe('comments command', () => {
  it('lists comments on a page with comment text in output', async () => {
    const result = await runCli(['comments', COMMENTS_PAGE_ID]);

    expect(result.exitCode).toBe(0);
    // The comments page has pre-existing comments; output should contain table headers
    expect(result.stdout).toContain('COMMENT');
  });
});
