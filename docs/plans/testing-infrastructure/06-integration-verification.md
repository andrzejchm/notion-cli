# Task 6: Integration Verification

<objective>
Verify all components from previous tasks integrate correctly and the feature works end-to-end. Resolve all deferred work items tracked during execution.
</objective>

<requirements>
MUST:
- Resolve all deferred work items (DW-* entries in PROGRESS.md)
- Verify components connect correctly across task boundaries
- Remove any orphaned mocks, stubs, or placeholder implementations from production code
- Verify the full local development workflow end-to-end:
  1. `.env.test` is populated with real credentials
  2. `npm run build` produces `dist/cli.js`
  3. `npm run test:integration` runs all integration tests and they pass
  4. `npm test` still runs unit tests and they pass
- Verify the CI workflow is correctly wired:
  1. The `integration` job references the correct npm script
  2. All 8 secrets are passed as env vars
  3. The job depends on `ci` and only runs on PRs
- Verify the LLM skill is self-contained and references correct file paths
- Verify `docs/testing-setup.md` is complete and consistent with the actual implementation
- Ensure no fixture IDs or tokens are committed to the repository

MUST NOT:
- Leave any DW-* items unresolved
- Introduce new functionality (this task is wiring + verification only)
</requirements>

<integration_points>
How components connect to each other:
- `package.json` script `test:integration` → `vitest.config.integration.ts` → `tests/integration/**/*.test.ts`
- Integration tests → `tests/integration/helpers/` (fixture helper + CLI runner)
- Fixture helper → `@notionhq/client` → Notion API (using `NOTION_TEST_TOKEN`)
- CLI runner → `dist/cli.js` (built binary) → Notion API (using `NOTION_TOKEN` set from `NOTION_TEST_TOKEN`)
- `.github/workflows/ci.yml` `integration` job → `npm run build` → `npm run test:integration`
- GitHub Actions secrets → environment variables in the integration job
- `.agents/skills/testing-notion-cli/SKILL.md` → `tests/e2e/scenarios.yaml` (skill references scenario file)
- `docs/testing-setup.md` → documents the manual setup for all of the above
</integration_points>

<acceptance_criteria>
- [ ] All DW-* items in PROGRESS.md are resolved
- [ ] `npm test` passes (existing unit tests unaffected)
- [ ] `npm run test:integration` passes against a configured Notion workspace
- [ ] `npm run build` succeeds and `dist/cli.js` exists
- [ ] `npm run typecheck` passes with all new files
- [ ] `npm run check` passes (biome lint/format)
- [ ] `.gitignore` contains `.env.test`
- [ ] No secrets or real IDs in any tracked file (verify with `git grep -i "ntn_"` and `git grep -i "notion_test_token"`)
- [ ] CI workflow YAML is valid (check with `actionlint` or manual review)
- [ ] `docs/testing-setup.md` accurately describes the setup matching the actual implementation
- [ ] The LLM skill file references the correct scenario file path (`tests/e2e/scenarios.yaml`)
- [ ] `tests/e2e/scenarios.yaml` is valid YAML and parseable
- [ ] No orphaned mocks/stubs in production code
- [ ] Integration tests clean up all duplicated fixtures (no orphans left in Notion after a full test run)
</acceptance_criteria>

<constraints>
MAY:
- Refactor wiring code to be cleaner
- Add missing imports/registrations
- Fix minor inconsistencies between documentation and implementation
- Add a smoke test that runs a single fast integration test to verify the full pipeline

MUST NOT:
- Add new features or change component behavior
- Skip any DW-* item without explicit user approval
- Modify existing unit tests
- Change the CLI's public behavior
</constraints>

<verification>
Manual end-to-end verification:

1. **Local development flow:**
   - Clone the repo fresh (or reset to clean state)
   - Follow `docs/testing-setup.md` to set up the Notion workspace (if not already done)
   - Create `.env.test` following the docs
   - Run `npm ci && npm run build`
   - Run `npm test` — unit tests pass
   - Run `npx dotenv -e .env.test -- npm run test:integration` — integration tests pass
   - Check Notion test root page — no orphaned duplicates remain

2. **CI flow:**
   - Open a PR with the changes
   - Verify the `ci` job runs and passes
   - Verify the `integration` job starts after `ci` completes
   - Verify the `integration` job passes (requires GitHub secrets to be configured)
   - Push to a branch without a PR — verify only `ci` runs

3. **LLM skill flow:**
   - Load the testing skill in an agent session
   - Ask the agent to run one scenario from `scenarios.yaml`
   - Verify the agent can parse the YAML, execute the scenario, and report results

Automated tests:
- [ ] Integration test: full suite passes (`npm run test:integration`)
- [ ] Unit test: existing suite passes (`npm test`)
- [ ] Typecheck: `npm run typecheck` passes
- [ ] Lint: `npm run check` passes
</verification>
