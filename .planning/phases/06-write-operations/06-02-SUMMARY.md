---
phase: 06-write-operations
plan: 02
subsystem: commands
tags: [comment, append, write-service, commander, notion-sdk, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: mdToBlocks() — markdown to Notion block array converter
  - phase: 01-foundation-auth
    provides: withErrorHandling, resolveToken, createNotionClient, parseNotionId, toUuid

provides:
  - addComment(client, pageId, text): Promise<void> — thin wrapper around client.comments.create
  - appendBlocks(client, blockId, blocks): Promise<void> — thin wrapper around client.blocks.children.append
  - commentAddCommand(): Command — `notion comment <id> -m <text>`
  - appendCommand(): Command — `notion append <id> -m <markdown>`

affects:
  - 06-03-create-page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Thin service layer wrapping Notion SDK write calls (addComment/appendBlocks)
    - requiredOption() pattern for mandatory CLI flags (no optional prompt fallback)
    - Empty-block guard: mdToBlocks result checked before API call

key-files:
  created:
    - src/services/write.service.ts
    - src/commands/comment-add.ts
    - src/commands/append.ts
  modified:
    - src/cli.ts

key-decisions:
  - "write.service.ts provides thin wrappers — no business logic, just SDK call + types; callers own ID conversion"
  - "appendCommand guards on blocks.length === 0 — prints 'Nothing to append.' rather than making empty API call"
  - "requiredOption() used for -m/--message — Commander exits with usage error if flag is missing, no manual validation needed"
  - "comment command is 'comment' (singular) not 'comment-add' — CLI surface stays clean; 'comments' (plural) is the read command"

requirements-completed:
  - WRITE-03
  - ADV-05

# Metrics
duration: 1min
completed: 2026-02-27
---

# Phase 6 Plan 02: comment + append Commands Summary

**Thin write.service.ts wrapping Notion SDK comments.create/blocks.children.append, wired as `notion comment` and `notion append` CLI commands**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-27T19:20:29Z
- **Completed:** 2026-02-27T19:21:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `src/services/write.service.ts`: `addComment()` and `appendBlocks()` — minimal wrappers with full rich_text annotations object
- `src/commands/comment-add.ts`: `notion comment <id> -m <text>` — uses `requiredOption`, `withErrorHandling`, prints "Comment added."
- `src/commands/append.ts`: `notion append <id> -m <markdown>` — converts markdown via `mdToBlocks()`, guards empty block array, prints "Appended N block(s)."
- `src/cli.ts`: both commands wired into Discovery section after `commentsCommand`
- `notion --help` shows both commands; individual `--help` shows `-m, --message` option
- Full test suite (99 tests) passes with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: write.service.ts + comment-add command** - `a01e232` (feat)
2. **Task 2: append command + CLI wiring** - `dbccc74` (feat)

## Files Created/Modified

- `src/services/write.service.ts` — `addComment()` and `appendBlocks()` exports (32 lines)
- `src/commands/comment-add.ts` — `commentAddCommand()` export (30 lines)
- `src/commands/append.ts` — `appendCommand()` export (38 lines)
- `src/cli.ts` — added imports and `program.addCommand()` calls for both commands

## Decisions Made

- **Thin service layer:** `write.service.ts` only wraps SDK calls with correct types. No ID conversion inside the service — callers (command files) use `toUuid()` before calling service functions. Consistent with `page.service.ts` pattern.
- **Empty block guard in appendCommand:** Rather than sending an empty `children: []` to the Notion API (which may error), detect `blocks.length === 0` early and print a user-friendly message. Clean UX for edge cases like empty strings.
- **`requiredOption()` for -m flag:** Commander handles the missing-flag error with a clear usage message. No manual check needed in the action handler.
- **Command name is `comment` (singular):** The read command is `comments` (plural). This matches natural English — "comment on this page" vs "show me the comments". Keeps the CLI intuitive.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — implementation straightforward. TypeScript compilation clean on first attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `notion comment` and `notion append` are ready for use by AI agents
- Phase 6 Plan 03 (create-page) can proceed — no blockers
- Both write commands follow the same pattern as read commands, making Plan 03 straightforward

---
*Phase: 06-write-operations*
*Completed: 2026-02-27*

## Self-Check: PASSED

- ✅ `src/services/write.service.ts` — exists
- ✅ `src/commands/comment-add.ts` — exists
- ✅ `src/commands/append.ts` — exists
- ✅ Commit `a01e232` (Task 1) — exists
- ✅ Commit `dbccc74` (Task 2) — exists
