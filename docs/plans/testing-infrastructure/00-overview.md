# Testing Infrastructure Implementation Plan

<goal>
Add integration tests that run the built CLI binary against a real Notion workspace, plus an LLM agent test skill for exploratory testing.
</goal>

<problem>
notion-cli has ~15 commands wrapping the Notion API. The current test suite is unit-only (vitest with mocked Notion client). There are no integration tests hitting a real Notion workspace, so regressions in API interaction, CLI output formatting, and end-to-end flows go undetected until manual testing.
</problem>

<architecture>
Three-layer testing architecture:

1. **Unit tests (existing, unchanged)** — vitest with mocked Notion client. Cover argument parsing, output formatting, and internal logic.
2. **CI integration tests (new)** — deterministic, shell-based tests that run the built CLI binary (`dist/cli.js`) against a real Notion workspace. Each test duplicates a fixture page via the Notion SDK, runs the CLI via `child_process.execFile`, asserts stdout/stderr/exit code, and deletes the duplicate in a `finally` block. Tests run serially (single fork) to avoid API rate limits. These block PR merges.
3. **LLM agent test skill (new)** — an OpenCode skill at `.agents/skills/testing-notion-cli/SKILL.md` that loads YAML scenarios from `tests/e2e/scenarios.yaml` and executes them on-demand. Not a merge gate.

Integration tests use a separate vitest config (`vitest.config.integration.ts`) with 30s timeouts and serial execution. Fixture pages live in a dedicated Notion workspace shared with a `notion-cli-tests` integration. Environment variables provide fixture IDs — stored in `.env.test` locally and GitHub Actions secrets in CI.
</architecture>

<tech_stack>
- TypeScript (Node 22, ESM)
- vitest v4 (test runner, separate config for integration)
- @notionhq/client v5 (fixture duplication/cleanup)
- child_process.execFile (CLI invocation)
- tsup (build before integration tests)
- GitHub Actions (CI workflow)
- YAML (scenario definitions for LLM skill)
</tech_stack>

<tasks>
1. Notion workspace setup & local env config — `01-workspace-setup.md`
2. Integration test helpers & vitest config — `02-test-helpers.md`
3. Core CLI integration tests — `03-core-integration-tests.md`
4. CI workflow integration job — `04-ci-workflow.md`
5. LLM agent test skill & scenario file — `05-llm-test-skill.md`
6. Integration Verification — `06-integration-verification.md`
</tasks>

<dependencies>
- Task 2 depends on Task 1 (helpers need fixture IDs to be documented)
- Task 3 depends on Task 2 (tests use the helpers)
- Task 4 depends on Task 2 (CI job runs the integration config)
- Task 5 is independent of Tasks 2-4 (skill + YAML are standalone files)
- Task 6 (Integration Verification) depends on all other tasks
</dependencies>

<global_constraints>
- All new TypeScript must pass `npm run typecheck` and `npm run check` (biome)
- Integration tests MUST NOT modify fixture pages — always duplicate first, clean up in `finally`
- Integration tests run serially (single fork) to avoid Notion API rate limits
- The existing unit test suite (`npm test`) must continue to pass unchanged
- `.env.test` must be in `.gitignore` — never commit secrets
- Use ESM imports (`.js` extensions in import paths) consistent with the existing codebase
</global_constraints>

<alternatives_considered>
- **LLM agent tests in CI** — Rejected. Slow, costly, non-deterministic. Not suitable as a merge gate.
- **Pre-existing fixtures without duplication** — Rejected. Fixtures accumulate mutations across test runs, causing flaky tests. Duplicate-and-delete gives each test a clean state.
- **Single test approach (CI only or LLM only)** — Rejected. Deterministic CI tests provide the reliability gate. LLM tests provide exploratory coverage for edge cases that are hard to enumerate upfront. Both are needed.
- **Docker-based Notion mock server** — Rejected. No official Notion API mock exists. Maintaining one would duplicate the effort of unit test mocks without the benefit of real API validation.
</alternatives_considered>
