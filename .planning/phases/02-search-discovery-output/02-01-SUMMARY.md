---
phase: 02-search-discovery-output
plan: "01"
subsystem: output
tags: [typescript, tty, json, table, pagination, notion-api]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: src/output/color.ts and src/output/stderr.ts utilities that format.ts coexists with

provides:
  - OutputMode ('auto' | 'json' | 'md') management with setOutputMode/getOutputMode
  - TTY detection via isatty() and isHumanMode()
  - formatJSON() for pipe/JSON mode output
  - formatTable() with capped column widths (TYPE=8, TITLE=50, ID=32) and truncation with ellipsis
  - printOutput() single routing function for all commands
  - paginateResults<T>() generic auto-pagination for Notion cursor-based API

affects:
  - 02-search-discovery-output (all subsequent plans depend on these utilities)
  - 03-page-reading (will use formatTable, printOutput)
  - 04-database-operations (will use paginateResults, formatTable)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-mode output: TTY → table, piped → JSON, --json flag forces JSON"
    - "Module-level singleton state for output mode (_mode)"
    - "Column width caps by name: TYPE=8, TITLE=50, ID=32, others natural"
    - "Generic fetcher-based pagination loop"

key-files:
  created:
    - src/output/format.ts
    - src/output/paginate.ts
  modified: []

key-decisions:
  - "OutputMode uses 'auto' as default — check TTY at render time, not at startup"
  - "printOutput is the single routing function — no mode-checking scattered in command files"
  - "Column widths capped per header name — TYPE=8, TITLE=50, ID=32, others natural"
  - "do-while loop replaced with while+flag to fix TypeScript scoping of response variable"
  - "paginateResults uses hasMore flag variable for correct TypeScript scoping"

patterns-established:
  - "formatTable(rows, headers): rows-first parameter order"
  - "All commands call printOutput() — single entry point for output routing"
  - "paginateResults<T>(fetcher) — generic with cursor-optional fetcher lambda"

requirements-completed: [OUT-01, OUT-02, OUT-03, OUT-04, SRCH-05]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 02 Plan 01: Output Formatting System Summary

**Dual-mode TTY/JSON output formatter with column-aligned ASCII tables and transparent Notion cursor-based auto-pagination**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-27T08:31:27Z
- **Completed:** 2026-02-27T08:35:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/output/format.ts` — full output mode management, TTY detection, formatJSON, formatTable with truncation, printOutput router
- `src/output/paginate.ts` — generic `paginateResults<T>` that transparently collects all Notion cursor pages
- All Phase 2 commands now have a ready foundation — zero mode-checking boilerplate needed in command files

## Task Commits

Each task was committed atomically:

1. **Task 1: Output formatter (format.ts)** - `99f5c27` (feat)
2. **Task 2: Pagination utility (paginate.ts)** - `5c9bca8` (feat)

## Files Created/Modified
- `src/output/format.ts` — OutputMode, setOutputMode, getOutputMode, isatty, isHumanMode, formatJSON, formatTable, printOutput
- `src/output/paginate.ts` — paginateResults<T> generic pagination helper

## Decisions Made
- `printOutput()` is the single output routing function — commands never check mode themselves
- Column caps by name: TYPE=8, TITLE=50, ID=32, all other headers use natural width
- `do-while` replaced with `while + hasMore flag` for TypeScript variable scoping correctness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript scoping error in paginateResults do-while loop**
- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** `do { const response = ... } while (response.has_more)` — `response` is scoped inside the loop block, not accessible in the `while` condition in TypeScript's strict mode
- **Fix:** Replaced `do-while` with `while (hasMore)` pattern using a `let hasMore = true` flag
- **Files modified:** src/output/paginate.ts
- **Verification:** `npx tsc --noEmit 2>&1 | grep "paginate.ts"` → no errors
- **Committed in:** `5c9bca8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Necessary fix for TypeScript strict scoping. Semantically equivalent behavior.

## Issues Encountered
- TypeScript strict mode doesn't allow `const` declared inside `do{}` block to be referenced in `while()` condition. Fixed by using a flag variable.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `format.ts` and `paginate.ts` ready for immediate use by all Phase 2 commands
- Import path: `../output/format.js` and `../output/paginate.js`
- No blockers for next plans in phase

---
*Phase: 02-search-discovery-output*
*Completed: 2026-02-27*
