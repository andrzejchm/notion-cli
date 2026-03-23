---
name: testing-notion-cli
description: Runs exploratory end-to-end test scenarios against the notion CLI using YAML-defined test cases. Use when testing CLI behavior, running e2e scenarios, validating CLI commands against a real Notion workspace, or discovering new edge-case scenarios.
---

## Overview

This skill lets you run end-to-end test scenarios defined in `tests/e2e/scenarios.yaml` against a live Notion workspace. You act as the test runner: parse the YAML, execute each scenario step by step in the terminal, check outputs against expectations, and report results.

This is **not** a CI gate. It is an agent-driven exploratory testing workflow.

## Prerequisites

The following environment variables must be set before running scenarios. They point to pre-existing fixture pages/databases in the test Notion workspace.

| Fixture name | Environment variable | Description |
|---|---|---|
| `rich-content-page` | `NOTION_FIXTURE_RICH_PAGE_ID` | Page with headings, lists, code blocks, toggles |
| `simple-page` | `NOTION_FIXTURE_SIMPLE_PAGE_ID` | Page with title + single paragraph |
| `empty-page` | `NOTION_FIXTURE_EMPTY_PAGE_ID` | Page with title only, no body |
| `task-database` | `NOTION_FIXTURE_TASK_DB_ID` | Database with Title, Status, Priority, Due Date, Tags and 5-10 rows |
| `empty-database` | `NOTION_FIXTURE_EMPTY_DB_ID` | Same schema as task-database but zero rows |
| `comments-page` | `NOTION_FIXTURE_COMMENTS_PAGE_ID` | Page with comments |

**Auth**: The CLI reads `NOTION_API_TOKEN` for authentication. Set it to a valid Notion integration token before running scenarios.

## Running Scenarios

### Run all scenarios

1. Load and parse `tests/e2e/scenarios.yaml`
2. For each scenario in the `scenarios` list, execute it (see "Executing a Scenario" below)
3. After all scenarios complete, print the summary report

### Run a single scenario by name

1. Load and parse `tests/e2e/scenarios.yaml`
2. Find the scenario whose `name` field matches the requested name (case-insensitive)
3. Execute that single scenario
4. Print the summary report

## Executing a Scenario

Each scenario follows this lifecycle: **setup -> commands -> cleanup**. Always run cleanup even if commands fail.

### 1. Setup

Process each entry in the `setup` list:

- `duplicate_fixture: <fixture-name>` — Look up the fixture's env var from the mapping table above, read the env var value to get the real Notion page/database ID, then duplicate it using the Notion MCP tools (`notion-duplicate-page`). Store the duplicated page's ID for placeholder substitution. Wait a few seconds after duplication for Notion to propagate the content.

After setup, you have a set of placeholder values available for substitution.

### 2. Placeholder Substitution

Before running each command, replace placeholders in the `run` string:

| Placeholder | Value |
|---|---|
| `{page_id}` | The ID of the duplicated page from setup |
| `{db_id}` | The ID of the duplicated database from setup |
| `{page_title}` | The title of the duplicated page (retrieve it after duplication) |

If a scenario duplicates multiple fixtures, the placeholder refers to the most recently duplicated fixture of that type (page or database).

### 3. Commands

For each entry in the `commands` list:

1. Substitute placeholders in the `run` string
2. Execute the command in the terminal: `notion <run string>`
   - The `run` field contains CLI arguments only (without the `notion` prefix)
3. Capture stdout, stderr, and exit code
4. Check against expectations:
   - `exit_code` — must match exactly
   - `stdout_contains` — each string in the list must appear somewhere in stdout
   - `stdout_not_contains` — none of these strings may appear in stdout
   - `stderr` — if set, stderr must contain this exact string
   - `stderr_contains` — each string in the list must appear somewhere in stderr
5. If any expectation fails, record the failure with details (expected vs actual) but continue to the next command

### 4. Cleanup

Process each entry in the `cleanup` list:

- `delete_page: <placeholder>` — Substitute the placeholder (e.g., `{page_id}`) and archive/delete the page using Notion MCP tools. This prevents fixture duplication from accumulating pages.

**Always run cleanup**, even if commands failed.

### 5. Report

After executing all scenarios (or a single one), output a structured report:

```
## E2E Scenario Report

| Scenario | Status | Details |
|---|---|---|
| read-rich-content-page | PASS | |
| append-and-read-back | FAIL | Command 2: stdout missing "appended-marker-..." |
| db-query-with-filter | PASS | |
| search-fixture-page | PASS | |

**Result: 3/4 passed, 1 failed**
```

For failures, include:
- Which command in the scenario failed (by index)
- Which expectation failed
- Expected value vs actual value (truncate long outputs to ~200 chars)

## Discovering and Adding New Scenarios

When exploring the CLI for edge cases or untested behavior:

1. Identify a CLI command or flag combination not covered by existing scenarios
2. Determine which fixture is appropriate (or if an existing one can be reused)
3. Write a new scenario entry following the YAML schema below
4. Append it to the `scenarios` list in `tests/e2e/scenarios.yaml`
5. Run the new scenario to verify it passes

### YAML Schema

```yaml
scenarios:
  - name: string            # unique kebab-case identifier
    description: string      # optional, human-readable explanation
    fixture: string          # logical fixture name from the mapping table
    setup:
      - duplicate_fixture: string   # fixture name to duplicate
    commands:
      - run: string          # CLI args with placeholders (no "notion" prefix)
        expect:
          exit_code: number
          stdout_contains: string[]       # optional
          stdout_not_contains: string[]   # optional
          stderr: string                  # optional, exact substring match
          stderr_contains: string[]       # optional
    cleanup:
      - delete_page: string  # placeholder like {page_id}
```

### Tips for writing good scenarios

- Use unique markers (e.g., `e2e-test-<timestamp>`) when appending content so you can verify it without false positives
- Keep scenarios independent — each one duplicates its own fixture and cleans up after itself
- Test one behavior per scenario — don't combine unrelated assertions
- Use `stdout_not_contains` to verify filtering actually excludes results
- For database queries, use `--filter` with known fixture data values
