import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';

const TASK_DB_ID = String(process.env.NOTION_FIXTURE_TASK_DB_ID);

describe('db schema command', () => {
  it('shows schema with expected column names', async () => {
    const result = await runCli(['db', 'schema', TASK_DB_ID]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Title');
    expect(result.stdout).toContain('Status');
    expect(result.stdout).toContain('Priority');
    expect(result.stdout).toContain('Due Date');
    expect(result.stdout).toContain('Tags');
  });
});
