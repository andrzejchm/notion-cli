---
phase: 02-search-discovery-output
plan: "04"
subsystem: cli
tags: [commander, cli-wiring, output-mode, json-flag, tty-detection]

# Dependency graph
requires:
  - phase: 02-search-discovery-output
    provides: "search, ls, open, users, comments commands + output formatter"
  - phase: 02-search-discovery-output
    provides: "setOutputMode() for TTY/JSON/MD switching"
provides:
  - "All Phase 2 commands wired into CLI entry point (src/cli.ts)"
  - "Global --json and --md flags on the program with preAction hook"
  - "notion search, ls, open, users, comments accessible as top-level CLI commands"
  - "Full Phase 2 feature set human-verified end-to-end"
affects:
  - Phase 3 (Page Reading)
  - Phase 4 (Database Operations)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global flag preAction hook: reads opts.json/opts.md → calls setOutputMode() before any command runs"
    - "Section comments (// --- Discovery ---) organise CLI command registrations"

key-files:
  created: []
  modified:
    - src/cli.ts

key-decisions:
  - "Global --json/--md flags live on the root program, not on each command — single preAction hook propagates to all subcommands"
  - "preAction hook checks json first, then md — json takes precedence if both flags somehow passed"

patterns-established:
  - "CLI wiring pattern: import command factory → program.addCommand(commandFactory()) — one line per command"
  - "Output mode set globally before command execution — commands never check TTY themselves"

requirements-completed:
  - SRCH-01
  - SRCH-02
  - SRCH-03
  - SRCH-04
  - SRCH-05
  - META-01
  - META-02
  - OUT-01
  - OUT-02
  - OUT-03
  - OUT-04

# Metrics
duration: ~15min
completed: 2026-02-27
---

# Phase 2 Plan 04: CLI Wiring & End-to-End Verification Summary

**All 5 Phase 2 commands (search, ls, open, users, comments) wired into CLI with global --json/--md flags and human-verified end-to-end against a live Notion workspace**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-27
- **Completed:** 2026-02-27
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1 (src/cli.ts)

## Accomplishments
- Registered all 5 Phase 2 commands in src/cli.ts under a `// --- Discovery ---` section comment
- Added global `--json` and `--md` flags to the root Commander program
- Updated preAction hook to call `setOutputMode('json')` or `setOutputMode('md')` before any command fires
- TypeScript build passed with no errors after wiring
- Human approved all commands working end-to-end against a live Notion workspace

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Phase 2 commands into CLI** - `98b6feb` (feat)
2. **Task 2: Verify Phase 2 commands end-to-end** - human-verify checkpoint (approved)

**Additional commit since agent ran:** `e33dc21` — feat(init): check integration access after token save, warn if no pages connected

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/cli.ts` — Added --json/--md global flags, updated preAction hook, imported and registered search/ls/open/users/comments commands

## Decisions Made
- Global --json/--md flags on the root program, not per-command — single preAction hook propagates output mode to all subcommands before execution
- preAction hook checks `opts.json` first, then `opts.md` — json takes precedence if both flags are provided
- Used `// --- Discovery ---` section comment to match `// --- Authentication ---` style from Phase 1

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 fully complete — all 5 discovery commands wired, dual-mode output working, human-verified
- Phase 3 (Page Reading) can now begin: `notion read <id/url>` command needs block-to-markdown converter
- Phase 4 (Database Operations) can also begin in parallel with Phase 3 — both depend only on Phase 2
- Known risk: notion-to-md v3 + @notionhq/client v5 compatibility needs early validation in Phase 3

---
*Phase: 02-search-discovery-output*
*Completed: 2026-02-27*
