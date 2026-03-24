# Task 1: Notion Workspace Setup & Local Env Config

<objective>
Document the manual Notion workspace setup and configure the project for local integration test runs.

This task creates the foundation everything else depends on: the `.env.test` file pattern, `.gitignore` entry, and the `test:integration` npm script. The Notion workspace and fixtures are created manually by a human following the documentation produced here.
</objective>

<requirements>
MUST:
- Add `.env.test` to `.gitignore` so test secrets are never committed
- Add `"test:integration": "vitest run --config vitest.config.integration.ts"` to `package.json` scripts
- Create a `docs/testing-setup.md` file documenting:
  - How to create the Notion integration (`notion-cli-tests`) with required capabilities (Read content, Update content, Insert content, Read comments, Create comments)
  - The exact fixture page/database structure to create under a `notion-cli-test-fixtures` root page
  - What content each fixture must contain (see fixture table below)
  - How to share the root page with the integration
  - How to extract page/database IDs from Notion URLs
  - How to populate `.env.test` with the extracted IDs
  - How to run integration tests locally: `npx dotenv -e .env.test -- npm run test:integration`
- Document all required environment variables with descriptions:
  - `NOTION_TEST_TOKEN` — integration token
  - `NOTION_TEST_ROOT_PAGE_ID` — root page containing all fixtures
  - `NOTION_FIXTURE_RICH_PAGE_ID` — page with headings, lists, toggles, callouts, code blocks, table, nested child pages
  - `NOTION_FIXTURE_SIMPLE_PAGE_ID` — page with title + single paragraph
  - `NOTION_FIXTURE_EMPTY_PAGE_ID` — page with title only, no body
  - `NOTION_FIXTURE_TASK_DB_ID` — database with Title, Status (select), Priority (number), Due Date (date), Tags (multi-select), 5-10 rows
  - `NOTION_FIXTURE_EMPTY_DB_ID` — same schema as Task Database, zero rows
  - `NOTION_FIXTURE_COMMENTS_PAGE_ID` — page with title + paragraph, 2-3 page-level comments and 1 inline comment

MUST NOT:
- Create actual Notion pages/databases programmatically (this is manual setup)
- Commit any real tokens or page IDs
- Modify existing unit test configuration or scripts
</requirements>

<acceptance_criteria>
- [ ] `.env.test` is listed in `.gitignore`
- [ ] `npm run test:integration` script exists in `package.json` and runs `vitest run --config vitest.config.integration.ts`
- [ ] `docs/testing-setup.md` exists with complete step-by-step instructions
- [ ] Documentation covers all 8 environment variables with descriptions
- [ ] Documentation includes the fixture content table (Rich Content Page, Simple Page, Empty Page, Task Database, Empty Database, Comments Page)
- [ ] Documentation includes the local run command with dotenv
- [ ] Existing `npm test` and `npm run ci` still work unchanged
</acceptance_criteria>

<constraints>
MAY:
- Choose the documentation format and level of detail
- Add a `.env.test.example` template file with placeholder values
- Add `dotenv-cli` as a devDependency if helpful for the local run command

MUST NOT:
- Change existing npm scripts (`test`, `ci`, `build`, etc.)
- Modify `vitest.config.ts` (the unit test config)
- Add any Notion tokens or real IDs to tracked files
</constraints>

<context>
- Existing `.gitignore`: `/Users/andrzejchm/Developer/notion-cli/.gitignore` — already ignores `.env` and `.env.local`
- Existing `package.json` scripts: `test`, `test:watch`, `build`, `ci`, etc.
- Existing vitest config: `vitest.config.ts` — unit tests only
- The `@notionhq/client` package is already a dependency
</context>

<verification>
How to manually verify this task works:
1. Confirm `.env.test` is in `.gitignore` by running `git check-ignore .env.test` — should output `.env.test`
2. Run `npm run test:integration` — should fail with "no test files found" (tests don't exist yet), NOT with a script-not-found error
3. Open `docs/testing-setup.md` and confirm it has clear, actionable instructions for creating the Notion workspace
4. Confirm `npm test` still runs existing unit tests successfully
</verification>
