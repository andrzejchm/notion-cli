import { describe, expect, it } from 'vitest';
import { runCli } from './helpers/cli-runner.js';

describe('search command', () => {
  it('finds a known fixture page by title', async () => {
    // Search for a term likely present in the test workspace.
    // The rich content fixture page should be discoverable.
    const result = await runCli(['search', 'Rich Content']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Rich Content');
  });
});
