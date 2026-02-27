---
phase: 02-search-discovery-output
plan: "02"
subsystem: commands
tags: [typescript, commander, notion-api, search, pagination, notion-sdk-v5]

# Dependency graph
requires:
  - phase: 02-search-discovery-output
    provides: src/output/format.ts and src/output/paginate.ts — printOutput, paginateResults utilities
  - phase: 01-foundation-auth
    provides: resolveToken, createNotionClient, withErrorHandling, reportTokenSource

provides:
  - searchCommand() — notion search <query> with --type and --json flags
  - lsCommand() — notion ls to list all accessible content, with --type and --json flags
  - Both commands use paginateResults for transparent auto-pagination
  - Both commands route output through printOutput (JSON or table based on mode)

affects:
  - 02-04 (CLI wiring — these commands will be registered in cli.ts)
  - 03-page-reading (same pattern for getTitle / type display)
  - 04-database-operations (same pattern for lsCommand filtering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SDK v5 compat: DataSourceObjectResponse (object: 'data_source') replaces DatabaseObjectResponse from search API"
    - "User-facing 'database' filter maps to SDK value 'data_source' in notion.search() filter"
    - "displayType() helper: maps 'data_source' → 'database' for human-readable output"
    - "isFullPageOrDataSource() used instead of isFullPage/isFullDatabase for search results"
    - "getTitle() inlined per command — avoids shared module for 6-line helper"

key-files:
  created:
    - src/commands/search.ts
    - src/commands/ls.ts
  modified: []

key-decisions:
  - "Notion SDK v5 search returns DataSourceObjectResponse (object: 'data_source') not DatabaseObjectResponse — isFullPageOrDataSource() used for filtering"
  - "User-facing --type accepts 'page' | 'database', mapped to SDK filter value 'page' | 'data_source' internally"
  - "displayType() maps 'data_source' to 'database' for human output — preserves expected UX"
  - "getTitle() inlined in each command file — 6-line helper, not worth a shared module"

patterns-established:
  - "All workspace discovery commands: resolveToken → createNotionClient → reportTokenSource → paginateResults → filter → printOutput"
  - "SDK v5 type mapping: user 'database' ↔ SDK 'data_source' at command boundary"
  - "Empty result messages: command-specific friendly string, process.stdout.write, return (not exit)"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 02 Plan 02: Search & Discovery Commands Summary

**`notion search` and `notion ls` commands using paginateResults + printOutput, with Notion SDK v5 DataSourceObjectResponse type mapping for databases**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T08:34:21Z
- **Completed:** 2026-02-27T08:36:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/commands/search.ts` — keyword search with `--type page|database` filter and `--json` flag, transparent auto-pagination
- `src/commands/ls.ts` — lists all accessible workspace content with optional `--type` filter and `--json` flag
- Both commands correctly handle Notion SDK v5's renamed `data_source` object type for databases

## Task Commits

Each task was committed atomically:

1. **Task 1: notion search command** - `b6f1cb8` (feat)
2. **Task 2: notion ls command** - `2d97daa` (feat)

## Files Created/Modified
- `src/commands/search.ts` — searchCommand() with keyword search, --type filter, --json flag
- `src/commands/ls.ts` — lsCommand() listing all accessible content, --type filter, --json flag

## Decisions Made
- Used `isFullPageOrDataSource()` instead of `isFullPage() || isFullDatabase()` — search API returns `DataSourceObjectResponse` in SDK v5
- Mapped user-facing `'database'` → SDK `'data_source'` in filter, and `'data_source'` → `'database'` for display
- Inlined `getTitle()` helper in each command file (6 lines, no shared module warranted)
- Empty results use `process.stdout.write(...)` + `return` — consistent with standard CLI patterns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Notion SDK v5 type mismatch for database filter and results**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** Plan specified `{ property: 'object', value: 'database' }` filter and `isFullDatabase()`, but Notion SDK v5 changed the type to `'data_source'`. `SearchResponse.results` is `PageObjectResponse | DataSourceObjectResponse`, not `DatabaseObjectResponse`. TypeScript error: `Type '{ value: "database" }' is not assignable to '{ value: "page" | "data_source" }'`
- **Fix:** Added `toSdkFilterValue()` mapping `'database'` → `'data_source'`, used `isFullPageOrDataSource()` for filtering, added `displayType()` to show `'database'` to users
- **Files modified:** src/commands/search.ts, src/commands/ls.ts
- **Verification:** `npx tsc --noEmit 2>&1 | grep "search.ts"` → no errors; full `npx tsc --noEmit` → no errors
- **Committed in:** `b6f1cb8` (Task 1), `2d97daa` (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug, SDK v5 type compatibility)
**Impact on plan:** Necessary fix for TypeScript correctness and runtime correctness. Semantically equivalent behavior from user perspective — 'database' type filter works as expected.

## Issues Encountered
- Notion SDK v5 renamed `DatabaseObjectResponse` to `DataSourceObjectResponse` (object: `"data_source"`) in search API results. The plan interfaces were written for SDK v4. Fixed by adapting type usage throughout both commands.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `search.ts` and `ls.ts` ready for CLI wiring in 02-04
- SDK v5 `DataSourceObjectResponse` pattern established — downstream plans should use `isFullPageOrDataSource()` for search results
- No blockers for 02-03 or 02-04

---
*Phase: 02-search-discovery-output*
*Completed: 2026-02-27*
