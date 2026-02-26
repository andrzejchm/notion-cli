---
phase: 01-foundation-auth
plan: "03"
subsystem: api
tags: [notion, url-parsing, regex, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    plan: "01"
    provides: CliError and ErrorCodes infrastructure used for INVALID_ID throws
provides:
  - Pure function parseNotionId(input) → 32-char hex string normalizing all Notion URL/ID formats
  - Pure function toUuid(id) → UUID with dashes for Notion API consumption
affects: [all commands that accept a page or database ID as CLI argument]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-regex pattern for Notion ID parsing: raw hex, UUID-with-dashes, URL with embedded hex"
    - "TDD with vitest: failing test commit (RED) → implementation commit (GREEN) → refactor commit"
    - "throwInvalidId helper: never-returning function to DRY up duplicate CliError construction"

key-files:
  created:
    - src/notion/url-parser.ts
    - tests/notion/url-parser.test.ts
  modified: []

key-decisions:
  - "Use lazy regex matching (.*?) in URL pattern to correctly handle IDs as bare path segments without page title prefix"
  - "Extract throwInvalidId() as a never-returning helper to avoid duplicating CliError construction at two throw sites"
  - "Normalize output to lowercase for consistency even though Notion IDs are already lowercase in practice"

patterns-established:
  - "Notion ID parsing: normalize to 32-char lowercase hex as the canonical internal format"
  - "URL regex: lazy match path prefix to tolerate workspace/title segments before the embedded ID"

requirements-completed:
  - AUTH-05

# Metrics
duration: 15min
completed: 2026-02-26
---

# Phase 1 Plan 03: Notion URL/ID Parser Summary

**Regex-based parseNotionId() and toUuid() that normalize all Notion URL/ID formats to 32-char hex, with 18 vitest tests covering pass-through, UUID stripping, notion.so/notion.site URLs, and INVALID_ID error throws**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-26T22:42:00Z
- **Completed:** 2026-02-26T22:57:00Z
- **Tasks:** 3 (RED → GREEN → REFACTOR)
- **Files modified:** 2

## Accomplishments
- 18 vitest tests covering all specified input formats and error cases
- `parseNotionId()` handles raw hex IDs, UUID with dashes, notion.so URLs (with/without workspace, page title, query params, fragments), and notion.site subdomain URLs
- `toUuid()` converts 32-char hex to 8-4-4-4-12 UUID format
- `CliError(INVALID_ID)` thrown with actionable suggestion on any unrecognized input

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `67c1abb` (test)
2. **Task 2 (GREEN): Implementation** - `0fc6a35` (feat)
3. **Task 3 (REFACTOR): Extract throwInvalidId helper** - `ae611e5` (refactor)

_TDD plan: 3 commits (test → feat → refactor)_

## Files Created/Modified
- `src/notion/url-parser.ts` - parseNotionId() and toUuid() with three-regex approach
- `tests/notion/url-parser.test.ts` - 18 tests across 5 describe groups

## Decisions Made
- **Lazy URL regex:** Initial regex used `(?:[^?#]*-)?` before the hex ID, which failed for bare-ID path segments like `/workspace/b55c9c91...?v=abc`. Switched to `.*?` (lazy) for the path prefix — correctly handles both page-title-prefixed and bare ID paths.
- **throwInvalidId helper:** Both the empty-string guard and the final throw constructed identical CliErrors. Extracted a `never`-returning helper to eliminate duplication.
- **Lowercase normalization:** All returned IDs are `.toLowerCase()`'d for consistency; in practice Notion IDs are already lowercase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed URL regex to handle bare path segment IDs**
- **Found during:** Task 2 (GREEN — running tests after first implementation)
- **Issue:** `https://www.notion.so/workspace/b55c9c91...?v=abc123` failed to match because the regex required a dash-separated prefix before the hex ID, but the ID was a direct path segment
- **Fix:** Changed URL regex from `(?:[^?#]*-)?([0-9a-f]{32})` to `.*?([0-9a-f]{32})(?:[?#]|$)` — lazy match for any path prefix
- **Files modified:** `src/notion/url-parser.ts`
- **Verification:** All 18 tests pass including the previously failing case
- **Committed in:** `0fc6a35` (GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary fix for correctness; no scope creep. All test cases from the plan's `<behavior>` block now pass.

## Issues Encountered
- Pre-existing `tests/config/paths.test.ts` failures using dynamic cache-busting imports (`?t=timestamp`) that Vite doesn't support. These are out-of-scope and deferred — not introduced or caused by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `parseNotionId()` and `toUuid()` are ready for use by any command accepting a page/database ID
- Pure functions with no side effects — safe to import anywhere
- All 18 tests passing

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-26*
