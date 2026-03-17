/**
 * Vitest setup file that validates all required environment variables
 * are present before any integration test runs.
 *
 * Fails fast with a clear message listing which vars are missing.
 */

const REQUIRED_ENV_VARS = [
  'NOTION_TEST_TOKEN',
  'NOTION_TEST_ROOT_PAGE_ID',
  'NOTION_FIXTURE_RICH_PAGE_ID',
  'NOTION_FIXTURE_SIMPLE_PAGE_ID',
  'NOTION_FIXTURE_EMPTY_PAGE_ID',
  'NOTION_FIXTURE_TASK_DB_ID',
  'NOTION_FIXTURE_EMPTY_DB_ID',
  'NOTION_FIXTURE_COMMENTS_PAGE_ID',
] as const;

const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
  const list = missing.map((name) => `  - ${name}`).join('\n');
  throw new Error(
    `Missing required environment variables for integration tests:\n${list}\n\n` +
      'Copy .env.test.example to .env.test and fill in real values.\n' +
      'See docs/testing-setup.md for instructions.',
  );
}
