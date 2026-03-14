import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';

const TASK_DB_ID = String(process.env.NOTION_FIXTURE_TASK_DB_ID);
const EMPTY_DB_ID = String(process.env.NOTION_FIXTURE_EMPTY_DB_ID);

describe('db query command', () => {
  it('queries a task database without filter and returns rows', async () => {
    const result = await runCli(['db', 'query', TASK_DB_ID]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toBe('');
    // stderr shows the entry count (e.g. "5 entries")
    expect(result.stderr).toContain('entries');
  });

  it('queries a task database with a filter', async () => {
    const result = await runCli([
      'db',
      'query',
      TASK_DB_ID,
      '--filter',
      'Status=Done',
    ]);

    expect(result.exitCode).toBe(0);
    // Filtered results should contain "Done" in the output
    expect(result.stdout).toContain('Done');
  });

  it('queries an empty database and reports no entries', async () => {
    const result = await runCli(['db', 'query', EMPTY_DB_ID]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No entries found.');
  });
});
