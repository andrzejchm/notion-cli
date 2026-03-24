# Task 3: Core CLI Integration Tests

<objective>
Write integration tests for the CLI's core commands: `read`, `append`, `search`, `db query`, `db schema`, `ls`, `comments`, and `comment`.

Each test exercises the real CLI binary against a real Notion workspace, verifying that commands produce correct output and exit codes for both happy paths and edge cases.
</objective>

<requirements>
MUST:
- Write tests in `tests/integration/` using the helpers from Task 2
- Every test MUST follow the lifecycle: duplicate fixture → run CLI → assert → cleanup in `finally`
- Cover the following commands with at least the specified scenarios:

**`read` command:**
- Read a rich content page — stdout contains markdown headings, list items; exit code 0
- Read an empty page — exit code 0, stdout is empty or contains only the title
- Read with `--json` flag — stdout is valid JSON
- Read with invalid page ID — non-zero exit code, stderr contains error message

**`append` command:**
- Append text to a simple page — exit code 0
- Verify appended text appears when reading the page back

**`search` command:**
- Search for a known fixture page by title — stdout contains the page title; exit code 0

**`db query` command:**
- Query task database without filter — returns rows; exit code 0
- Query task database with filter (e.g., Status=Done) — stdout contains matching rows, does not contain non-matching rows
- Query empty database — exit code 0, output indicates no results

**`db schema` command:**
- Get schema of task database — stdout contains column names (Title, Status, Priority, Due Date, Tags); exit code 0

**`comments` command:**
- List comments on comments page — stdout contains comment text; exit code 0

**`comment` (add) command:**
- Add a comment to a duplicated page — exit code 0
- Verify the comment appears when listing comments

**`ls` command:**
- List children of rich content page — stdout contains child page names; exit code 0

MUST NOT:
- Skip the cleanup step — every `duplicateFixture` call must have a corresponding `cleanup()` in a `finally` block
- Assert on exact output strings that could change with Notion API updates — use `toContain` for substrings, not `toBe` for full output
- Depend on test execution order — each test must be independently runnable
- Modify fixture pages directly — always work on duplicates
</requirements>

<acceptance_criteria>
- [ ] Test file(s) exist in `tests/integration/` for each command group
- [ ] All tests follow the duplicate→run→assert→cleanup lifecycle
- [ ] `read` command: at least 4 test cases (rich page, empty page, JSON output, invalid ID)
- [ ] `append` command: at least 2 test cases (append + read-back verification)
- [ ] `search` command: at least 1 test case
- [ ] `db query` command: at least 3 test cases (unfiltered, filtered, empty DB)
- [ ] `db schema` command: at least 1 test case
- [ ] `comments` command: at least 1 test case
- [ ] `comment` (add) command: at least 2 test cases (add + verify)
- [ ] `ls` command: at least 1 test case
- [ ] All tests pass when run with `npm run test:integration` against a properly configured Notion workspace
- [ ] No test modifies the original fixture pages
</acceptance_criteria>

<constraints>
MAY:
- Organize tests into one file per command or group related commands
- Add additional edge case tests beyond the minimum specified
- Use vitest's `describe` blocks to group related scenarios
- Share fixture duplication across tests in the same describe block if cleanup is still guaranteed
- Use `beforeAll`/`afterAll` for fixture setup/teardown within a describe block (with `finally`-style cleanup)

MUST NOT:
- Import from `src/` — all interaction is through the CLI binary via `runCli`
- Assert on Notion page IDs (they change per duplication)
- Use snapshot testing (output varies between runs due to dynamic content)
- Add tests for `open` command (it launches a browser, not testable in CI)
- Add tests for `auth`, `init`, `profile`, or `completion` commands (these involve interactive flows or local config)
</constraints>

<context>
- CLI commands available: `read`, `append`, `search`, `ls`, `open`, `comments`, `comment`, `create-page`, `edit-page`, `db query`, `db schema`, `users`, `auth`, `init`, `profile`, `completion`
- CLI accepts `--json` and `--md` global flags for output format
- CLI reads `NOTION_TOKEN` from env (the runner helper sets this)
- Existing unit tests: `tests/commands/append.test.ts`, `tests/commands/edit-page.test.ts` — these mock everything; integration tests hit real API
- Fixture content details are in `docs/testing-setup.md` (from Task 1)
</context>

<verification>
How to manually verify this task works:
1. Ensure Notion workspace is set up with all fixtures (Task 1)
2. Ensure `.env.test` is populated with correct IDs
3. Run `npm run build` to build the CLI
4. Run `npx dotenv -e .env.test -- npm run test:integration`
5. All tests should pass
6. Check the Notion test root page — no orphaned duplicate pages should remain after a clean test run
7. Run a single test file in isolation to confirm independence: `npx dotenv -e .env.test -- npx vitest run --config vitest.config.integration.ts tests/integration/read.test.ts`
</verification>
