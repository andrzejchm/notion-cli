# Task 4: CI Workflow Integration Job

<objective>
Add an `integration` job to the existing GitHub Actions CI workflow that builds the CLI and runs integration tests against the real Notion workspace on pull requests.

This makes integration tests a merge gate — PRs cannot merge if they break real API interactions.
</objective>

<requirements>
MUST:
- Add a new `integration` job to `.github/workflows/ci.yml`
- The job MUST:
  - Depend on the existing `ci` job (use `needs: ci`) so it only runs after unit tests pass
  - Run only on pull requests (`if: github.event_name == 'pull_request'`)
  - Use `ubuntu-latest` runner
  - Check out the repo
  - Set up Node 22 with npm cache
  - Install dependencies (`npm ci`)
  - Build the CLI (`npm run build`)
  - Run integration tests using the npm script: `npm run test:integration`
  - Pass all required environment variables from GitHub Actions secrets:
    - `NOTION_TEST_TOKEN`
    - `NOTION_TEST_ROOT_PAGE_ID`
    - `NOTION_FIXTURE_RICH_PAGE_ID`
    - `NOTION_FIXTURE_SIMPLE_PAGE_ID`
    - `NOTION_FIXTURE_EMPTY_PAGE_ID`
    - `NOTION_FIXTURE_TASK_DB_ID`
    - `NOTION_FIXTURE_EMPTY_DB_ID`
    - `NOTION_FIXTURE_COMMENTS_PAGE_ID`
- Document in `docs/testing-setup.md` (append a section) which GitHub Actions secrets need to be configured and where to set them (repo Settings → Secrets and variables → Actions)

MUST NOT:
- Modify the existing `ci` job or the composite action at `.github/actions/ci/action.yml`
- Run integration tests on push events (only on PRs — to limit API usage)
- Hard-code any secrets or IDs in the workflow file
- Make the integration job block pushes to main (only PRs)
</requirements>

<acceptance_criteria>
- [ ] `.github/workflows/ci.yml` contains an `integration` job
- [ ] The integration job depends on the `ci` job (`needs: ci`)
- [ ] The integration job only runs on `pull_request` events
- [ ] The integration job builds the CLI before running tests
- [ ] All 8 environment variables are passed from secrets
- [ ] The integration job uses `npm run test:integration` (the script from Task 1)
- [ ] The existing `ci` job is unchanged
- [ ] `docs/testing-setup.md` documents the required GitHub Actions secrets
</acceptance_criteria>

<constraints>
MAY:
- Add a `timeout-minutes` to the integration job (recommended: 10 minutes)
- Add a descriptive `name` to the integration job for the GitHub UI
- Cache npm dependencies if not already handled by setup-node

MUST NOT:
- Change the trigger conditions for the existing `ci` job
- Remove or modify any existing workflow steps
- Use `continue-on-error: true` on the integration test step (failures must block)
- Add the integration job to `publish.yml`
</constraints>

<context>
- Existing CI workflow: `.github/workflows/ci.yml` — single `ci` job using composite action
- Composite action: `.github/actions/ci/action.yml` — installs deps, typechecks, lints, runs unit tests
- The integration job intentionally does NOT reuse the composite action because it needs a build step and different test command
- Publish workflow: `.github/workflows/publish.yml` — triggered by version tags, should not be modified
</context>

<verification>
How to manually verify this task works:
1. Open a PR against the repo
2. Check GitHub Actions — the `ci` job should run first
3. After `ci` passes, the `integration` job should start
4. The integration job should build the CLI and run integration tests
5. If secrets are configured correctly, tests should pass
6. If secrets are missing, the integration tests should fail with clear env var errors (from Task 2's validation)
7. Push to a branch without a PR — only the `ci` job should run, not `integration`
</verification>
