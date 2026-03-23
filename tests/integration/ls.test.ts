import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';

describe('ls command', () => {
  it('lists accessible workspace content', async () => {
    const result = await runCli(['ls']);

    expect(result.exitCode).toBe(0);
    // The workspace has fixture pages, so output should contain content
    expect(result.stdout).not.toBe('');
    // Output should contain table headers
    expect(result.stdout).toContain('TYPE');
    expect(result.stdout).toContain('TITLE');
  });
});
