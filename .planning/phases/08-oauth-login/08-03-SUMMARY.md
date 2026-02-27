---
phase: 08-oauth-login
plan: 03
subsystem: auth
tags: [oauth, docs, readme, skill, typescript]

# Dependency graph
requires:
  - phase: 08-oauth-login (plan 01)
    provides: resolveToken() with source field, ProfileConfig OAuth extensions
  - phase: 08-oauth-login (plan 02)
    provides: notion auth login/logout/status commands

provides:
  - README.md Authentication section with OAuth user login subsection
  - SKILL.md Authentication section with auth login/logout/status commands and attribution explanation
  - notion init OAuth hint (stderrWrite at end of success flow)
  - display_name: user passed in comment API call when source is 'oauth' (user attribution fix)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - display_name:{type:'user'} passed to comments.create() when OAuth source — Notion API requirement for user attribution
    - init hint pattern: stderrWrite(dim(...)) appended after existing write capabilities hint

key-files:
  created: []
  modified:
    - README.md
    - docs/skills/using-notion-cli/SKILL.md
    - src/commands/init.ts
    - src/commands/comment-add.ts
    - src/services/write.service.ts

key-decisions:
  - "display_name:{type:'user'} required in Notion comment API call for OAuth-attributed comments — discovered during human verification"
  - "SKILL.md (docs/skills/using-notion-cli/SKILL.md) is the effective agent-skill file — plan referenced docs/agent-skill.md which was renamed during Phase 5"
  - "Auth priority documented in both README and SKILL.md: OAuth takes precedence over internal integration token when both configured"

requirements-completed:
  - OAUTH-07
  - OAUTH-08

# Metrics
duration: ~15min (including checkpoint verification and fix)
completed: 2026-02-27
---

# Phase 8 Plan 03: Documentation Update + OAuth E2E Verification Summary

**README and SKILL.md updated with OAuth auth guidance; init hint added; display_name user fix discovered during human verification — OAuth-attributed comments now show user name in Notion**

## Performance

- **Duration:** ~15 min (including human verification window)
- **Started:** ~2026-02-27T22:00Z
- **Completed:** 2026-02-27T22:12Z
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 5

## Accomplishments

- README.md: expanded Authentication section into two named subsections — "Internal integration token" and "OAuth user login (recommended for write operations)" — with code examples and headless server guidance
- SKILL.md: added `## Authentication` section near top documenting both auth methods, OAuth command trio (login/logout/status), and auth priority rule
- init.ts: appended `notion auth login` hint at end of success flow so users are immediately pointed to user-attributed writes
- addComment() updated to pass `display_name: { type: 'user' }` when source is `'oauth'` — required by Notion API for comment attribution to the actual user
- End-to-end OAuth flow verified: authenticated as Andrzej Chmielewski, comments show "Andrzej Chmielewski (via ncli)" in Notion

## Task Commits

Each task was committed atomically:

1. **Task 1: Update init hint, README, and agent-skill docs** - `7d299a8` (feat)
2. **Fix: display_name user for OAuth-attributed comments** - `18899aa` (fix) — applied during human verification

## Files Created/Modified

- `README.md` — expanded Authentication section with OAuth user login subsection, headless instructions, and auth priority note
- `docs/skills/using-notion-cli/SKILL.md` — added Authentication section: internal token vs OAuth, auth login/logout/status command docs with flags
- `src/commands/init.ts` — OAuth hint (`notion auth login`) appended after existing write capabilities hint
- `src/commands/comment-add.ts` — passes `asUser: source === 'oauth'` to addComment()
- `src/services/write.service.ts` — addComment() accepts `options: { asUser?: boolean }`, spreads `display_name: { type: 'user' }` when asUser is true

## Decisions Made

- `display_name: { type: 'user' }` is required in `client.comments.create()` for Notion API to attribute the comment to the OAuth user — without it, comments are attributed to the integration bot even with a valid OAuth token
- `docs/skills/using-notion-cli/SKILL.md` is the canonical agent skill file (plan referenced `docs/agent-skill.md` which was the original name from Phase 5; it was renamed during Phase 5 execution — both are equivalent)
- Auth priority documented clearly in both docs: "If both configured, OAuth takes precedence" — consistent with resolveToken() behavior from 08-01

## Deviations from Plan

### Auto-fixed Issues (post-checkpoint)

**1. [Rule 1 - Bug] OAuth comments not attributed to user without display_name field**
- **Found during:** Human verification (checkpoint)
- **Issue:** Even with a valid OAuth access token, Notion API attributes comments to the integration bot unless `display_name: { type: 'user' }` is explicitly passed in the comment request body
- **Fix:** `addComment()` extended with `options: { asUser?: boolean }` parameter; `comment-add.ts` passes `asUser: source === 'oauth'`; `display_name: { type: 'user' }` spread into the API call when asUser is true
- **Files modified:** `src/commands/comment-add.ts`, `src/services/write.service.ts`
- **Commit:** `18899aa`

## Human Verification Results

- `notion auth --help` — shows login/logout/status subcommands ✓
- `notion auth status` — showed "OAuth: ✓ Logged in as Andrzej Chmielewski" ✓
- `notion auth login` — opened browser, authenticated successfully ✓
- `notion comment <id> -m "..."` — comment appeared attributed to "Andrzej Chmielewski (via ncli)" ✓
- README Authentication section updated and readable ✓
- SKILL.md auth section updated ✓

## Phase 8 Complete

All 3 plans in Phase 8 OAuth Login are complete:
- **08-01**: Type system, OAuth client module, resolveToken() with auto-refresh
- **08-02**: Loopback browser flow, auth login/logout/status commands
- **08-03**: Docs update, init hint, E2E verification + attribution fix

---
*Phase: 08-oauth-login*
*Completed: 2026-02-27*
