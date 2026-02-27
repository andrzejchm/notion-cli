---
phase: 02-search-discovery-output
plan: "03"
subsystem: cli
tags: [notion, commander, child_process, browser-open, users-api, comments-api, pagination]

# Dependency graph
requires:
  - phase: 02-01
    provides: output utilities (format.ts, paginate.ts) used by all three commands
  - phase: 01-foundation-auth
    provides: url-parser (parseNotionId, toUuid), resolveToken, createNotionClient, withErrorHandling
provides:
  - openCommand() — cross-platform browser opener for Notion pages (no API call)
  - usersCommand() — paginated workspace user listing with TYPE/NAME/EMAIL/ID columns
  - commentsCommand() — paginated page comments listing with UUID block_id conversion
affects: [02-04, phase-3-page-reading]

# Tech tracking
tech-stack:
  added: [node:child_process, node:util.promisify]
  patterns: [cross-platform process.platform detection, discriminated union type narrowing for UserObjectResponse, UUID conversion before comments API call]

key-files:
  created:
    - src/commands/open.ts
    - src/commands/users.ts
    - src/commands/comments.ts
  modified: []

key-decisions:
  - "UserObjectResponse is a discriminated union (type='person'|'bot') — access person/bot fields via type narrowing not direct access"
  - "comments.list() requires block_id in UUID format — parseNotionId returns 32-hex, toUuid() converts before API call"
  - "open command prints Opening {url} to stdout so piped usage is scriptable (no --json needed)"
  - "comments table truncates author to partial ID (8 chars...) — N+1 calls needed for name, callers can join with notion users output"

patterns-established:
  - "Cross-platform open: process.platform === 'darwin' ? 'open' : 'win32' ? 'start' : 'xdg-open'"
  - "UserObjectResponse discriminated union narrowing via user.type === 'person'|'bot'"
  - "Empty results: print informative message to stdout and return 0 (not error)"

requirements-completed: [SRCH-04, META-01, META-02]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 02 Plan 03: notion open, users, and comments commands Summary

**Three lightweight meta/utility CLI commands: cross-platform browser page opener, paginated workspace user listing, and paginated page comment reader with UUID ID conversion**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T08:34:31Z
- **Completed:** 2026-02-27T08:36:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `notion open <id/url>` — opens Notion page in system browser (darwin/linux/win32) without any API call; prints URL to stdout for scriptability
- `notion users [--json]` — lists all workspace users (paginated) with TYPE, NAME, EMAIL/WORKSPACE, ID columns
- `notion comments <id/url> [--json]` — lists page comments (paginated) with date, partial author ID, and truncated text; converts 32-hex ID to UUID format required by comments API

## Task Commits

Each task was committed atomically:

1. **Task 1: notion open and notion users commands** - `55dc34e` (feat)
2. **Task 2: notion comments command** - `d3dd5eb` (feat)

**Plan metadata:** _(docs commit to follow)_

## Files Created/Modified
- `src/commands/open.ts` — Cross-platform browser open using child_process exec; no API call; prints URL to stdout
- `src/commands/users.ts` — Paginated users.list() with UserObjectResponse discriminated union type narrowing
- `src/commands/comments.ts` — Paginated comments.list() with toUuid() conversion; table truncates comment text to 80 chars

## Decisions Made
- **UserObjectResponse type narrowing:** The SDK type is `UserObjectResponseCommon & (PersonUserObjectResponse | BotUserObjectResponse)` — accessing `person` and `bot` directly fails TypeScript strict mode. Used discriminated union narrowing via `user.type === 'person'|'bot'` in a helper function.
- **comments block_id UUID format:** Notion's comments.list() requires UUID-formatted block_id. Added `toUuid()` call after `parseNotionId()` to ensure correct format.
- **Partial author ID in comments table:** Fetching user names would require N+1 API calls. Displayed `created_by.id.slice(0, 8) + '...'` in table; full ID available in JSON mode for joining with `notion users` output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UserObjectResponse type access for person/bot fields**
- **Found during:** Task 1 (notion users command)
- **Issue:** Plan specified `user.person?.email ?? user.bot?.workspace_name` but `UserObjectResponse` in SDK v5 is a discriminated union — `person` and `bot` are not directly accessible on the union type
- **Fix:** Added `getEmailOrWorkspace(user: UserObjectResponse)` helper that narrows via `user.type === 'person'|'bot'` before accessing subtype fields
- **Files modified:** src/commands/users.ts
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** 55dc34e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — TypeScript discriminated union type narrowing)
**Impact on plan:** Necessary correction for TypeScript strict mode. No scope creep.

## Issues Encountered
- None beyond the auto-fixed type narrowing issue above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three commands are ready to be wired into the CLI in plan 02-04
- `open.ts`, `users.ts`, `comments.ts` export their command factories as specified
- TypeScript compiles cleanly across all new files

---
*Phase: 02-search-discovery-output*
*Completed: 2026-02-27*
