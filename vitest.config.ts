import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    exclude: [
      'tests/integration/**',
      'tests/e2e/**',
      'node_modules/**',
      '.opencode/**',
    ],
  },
});
