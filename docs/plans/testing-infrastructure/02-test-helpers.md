# Task 2: Integration Test Helpers & Vitest Config

<objective>
Create the integration test infrastructure: vitest config for integration tests, a fixture duplication/cleanup helper using the Notion SDK, and a CLI runner helper that shells out to the built binary.

These helpers are the shared foundation for all integration tests. They encapsulate the duplicate→run→assert→cleanup lifecycle so individual test files stay focused on assertions.
</objective>

<requirements>
MUST:
- Create `vitest.config.integration.ts` at the project root with:
  - Test file pattern: `tests/integration/**/*.test.ts`
  - Test timeout: 30 seconds
  - Hook timeout: 30 seconds
  - Pool: `forks` with `singleFork: true` (serial execution to avoid API rate limits)
- Create a fixture helper (`tests/integration/helpers/`) that:
  - Initializes a Notion client using `process.env.NOTION_TEST_TOKEN`
  - Exports a `duplicateFixture(fixtureId: string)` function that:
    - Retrieves the fixture page/database properties via the Notion API
    - Creates a duplicate under `NOTION_TEST_ROOT_PAGE_ID`
    - Returns an object with `{ id: string, cleanup: () => Promise<void> }`
    - The `cleanup` function archives the duplicate via `notion.pages.update({ archived: true })`
  - Handles both page fixtures and database fixtures (databases need `notion.databases.create` to duplicate)
  - Throws a clear error if required env vars are missing
- Create a CLI runner helper (`tests/integration/helpers/`) that:
  - Resolves the CLI binary path to `dist/cli.js` relative to the project root
  - Exports a `runCli(args: string[])` function that:
    - Runs `node <cli-path> ...args` via `child_process.execFile` (promisified)
    - Sets `NOTION_TOKEN` in the child process env to `process.env.NOTION_TEST_TOKEN`
    - Returns `{ stdout: string, stderr: string, exitCode: number }`
    - Captures stdout/stderr even on non-zero exit (from the error object)
    - Has a 15-second timeout per invocation
- Create a setup file or global setup that validates all required env vars are present before any test runs, failing fast with a clear message listing which vars are missing

MUST NOT:
- Import or depend on any source code from `src/` — helpers use `@notionhq/client` directly and shell out to the built binary
- Deep-copy block children for page duplication (shallow copy of properties is sufficient for the initial implementation — deep copy can be added later if tests need it)
- Swallow errors in cleanup — log cleanup failures but don't mask test failures
</requirements>

<acceptance_criteria>
- [ ] `vitest.config.integration.ts` exists and configures serial execution with 30s timeouts
- [ ] `npm run test:integration` uses this config (from Task 1's script)
- [ ] Fixture helper can duplicate a Notion page and return its ID
- [ ] Fixture helper's cleanup function archives the duplicated page
- [ ] CLI runner executes the built binary and captures stdout, stderr, exit code
- [ ] CLI runner returns exit code from failed commands (not just 0)
- [ ] Missing env vars cause a fast, descriptive failure before tests run
- [ ] All helper code passes `npm run typecheck` and `npm run check`
</acceptance_criteria>

<constraints>
MAY:
- Choose file names and internal structure within `tests/integration/helpers/`
- Use vitest's `globalSetup` or a `beforeAll` in a setup file for env var validation
- Add a helper for database fixture duplication separately from page duplication
- Export additional utility types (e.g., `CliResult`, `Fixture`) if useful

MUST NOT:
- Import anything from `src/` — integration tests treat the CLI as a black box
- Run tests in parallel (must use single fork)
- Hard-code any Notion page IDs — all IDs come from environment variables
- Add new runtime dependencies to `package.json` (use existing `@notionhq/client`; `vitest` is already a devDependency)
</constraints>

<context>
- Notion client is already a dependency: `@notionhq/client` v5.11.1
- CLI binary output: `dist/cli.js` (see `tsup.config.ts` entry point and `package.json` bin field)
- Existing vitest config pattern: `vitest.config.ts` at project root
- ESM project: `"type": "module"` in `package.json`, use `.js` extensions in imports
- The CLI reads `NOTION_TOKEN` env var for auth (see `src/config/token.ts`)
</context>

<verification>
How to manually verify this task works:
1. Set up `.env.test` with real Notion credentials (from Task 1's docs)
2. Run `npm run build` to ensure `dist/cli.js` exists
3. Write a minimal throwaway test that duplicates a fixture, runs `notion read <id>`, and cleans up
4. Run `npx dotenv -e .env.test -- npm run test:integration` — the throwaway test should pass
5. Remove a required env var from `.env.test` and re-run — should fail with a clear message about the missing var
</verification>
