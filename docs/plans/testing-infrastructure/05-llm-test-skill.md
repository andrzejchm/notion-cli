# Task 5: LLM Agent Test Skill & Scenario File

<objective>
Create an OpenCode skill that enables LLM agents to run exploratory test scenarios against the CLI, and a YAML scenario file defining the initial set of test cases.

This provides a complementary testing layer — agents can run scenarios on-demand, discover edge cases, and append new scenarios to the YAML file. Unlike CI integration tests, this is not a merge gate.
</objective>

<requirements>
MUST:
- Create `.agents/skills/testing-notion-cli/SKILL.md` as an OpenCode skill with:
  - Proper frontmatter (`name`, `description`)
  - Instructions for the agent to:
    1. Load and parse `tests/e2e/scenarios.yaml`
    2. For each scenario: duplicate the fixture, run CLI commands with placeholder substitution, check output against expectations, clean up
    3. Output a structured pass/fail report with scenario name, status, and failure details
    4. Support running a single scenario by name or all scenarios
  - Instructions for discovering and appending new edge-case scenarios to `scenarios.yaml`
  - Reference to the fixture name → env var mapping (e.g., `rich-content-page` → `NOTION_FIXTURE_RICH_PAGE_ID`)
  - Guidance on placeholder substitution: `{page_id}`, `{db_id}`, `{page_title}` are replaced with values from the setup step
- Create `tests/e2e/scenarios.yaml` with initial scenarios covering:
  - `read` — read a rich content page, verify markdown output contains headings, code blocks, list items
  - `append` — append text to a simple page, read it back, verify the text appears
  - `db query` with filter — query task database filtering by Status, verify matching/non-matching rows
  - `search` — search for a fixture page by title, verify it appears in results
- The YAML file MUST follow this schema:
  ```
  scenarios:
    - name: string
      description: string (optional)
      fixture: string (logical name)
      setup:
        - duplicate_fixture: string
      commands:
        - run: string (CLI command with placeholders)
          expect:
            exit_code: number
            stdout_contains: string[] (optional)
            stdout_not_contains: string[] (optional)
            stderr: string (optional, exact match)
            stderr_contains: string[] (optional)
      cleanup:
        - delete_page: string (placeholder)
  ```

MUST NOT:
- Make the skill a CI merge gate — it's for on-demand exploratory testing only
- Include real Notion tokens or page IDs in the skill or scenario file
- Create a programmatic scenario runner (the LLM agent interprets and executes the YAML)
- Duplicate the integration test helpers from Task 2 — the skill instructs the agent to use the CLI directly
</requirements>

<acceptance_criteria>
- [ ] `.agents/skills/testing-notion-cli/SKILL.md` exists with valid frontmatter and complete instructions
- [ ] `tests/e2e/scenarios.yaml` exists with at least 4 scenarios (read, append, db query, search)
- [ ] Each scenario has name, fixture reference, setup, commands with expectations, and cleanup
- [ ] The skill documents the fixture name → env var mapping
- [ ] The skill explains how to run all scenarios and how to run a single scenario
- [ ] The skill explains how to discover and add new scenarios
- [ ] The YAML is valid and parseable
</acceptance_criteria>

<constraints>
MAY:
- Add more than 4 initial scenarios if useful edge cases are obvious
- Include guidance in the skill for how the agent should handle flaky scenarios (retry logic)
- Add a `tags` field to scenarios for filtering (e.g., `tags: [read, smoke]`)
- Reference the `yaml` npm package (already a dependency) for parsing guidance

MUST NOT:
- Create any TypeScript code for this task — the skill is pure Markdown, scenarios are pure YAML
- Add the skill to any CI pipeline
- Depend on the integration test helpers from `tests/integration/helpers/`
- Include scenarios for interactive commands (`auth`, `init`, `profile`)
</constraints>

<context>
- Existing skill pattern: `.agents/skills/releasing-notion-cli/SKILL.md` — uses frontmatter with `name` and `description`
- The `yaml` package is already a dependency in `package.json`
- CLI commands: `read`, `append`, `search`, `ls`, `comments`, `comment`, `create-page`, `edit-page`, `db query`, `db schema`, `users`
- The agent running scenarios will have access to the terminal and can run CLI commands directly
- Fixture logical names map to env vars: `rich-content-page` → `NOTION_FIXTURE_RICH_PAGE_ID`, `simple-page` → `NOTION_FIXTURE_SIMPLE_PAGE_ID`, etc.
</context>

<verification>
How to manually verify this task works:
1. Open `.agents/skills/testing-notion-cli/SKILL.md` — confirm it has clear, actionable instructions
2. Parse `tests/e2e/scenarios.yaml` with a YAML parser — confirm it's valid
3. Manually walk through one scenario following the skill's instructions:
   - Duplicate the fixture page via Notion API
   - Run the CLI command with the duplicated page ID
   - Check the output against the expectations
   - Clean up the duplicate
4. Confirm the skill is discoverable by checking it appears in the skills directory
</verification>
