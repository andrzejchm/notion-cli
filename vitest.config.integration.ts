import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ['tests/integration/helpers/validate-env.ts'],
  },
});
