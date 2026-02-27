---
phase: 08-oauth-login
plan: 02
subsystem: auth
tags: [oauth, http-server, loopback, cli, typescript, commander]

# Dependency graph
requires:
  - phase: 08-oauth-login (plan 01)
    provides: buildAuthUrl(), exchangeCode(), saveOAuthTokens(), clearOAuthTokens(), OAuthTokenResponse, OAUTH_REDIRECT_URI

provides:
  - runOAuthFlow(): loopback HTTP server on localhost:54321 with CSRF state, browser open, 120s timeout, manual fallback
  - notion auth login command (--profile, --manual flags, TTY guard)
  - notion auth logout command (--profile flag, OAuth-only clear)
  - notion auth status command (--profile flag, shows OAuth + internal token + active method)
  - auth subcommand group wired into notion CLI
affects: [08-03-docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Loopback HTTP server for OAuth callback (no remote server required)
    - Platform-aware browser open with manual fallback (open/xdg-open/cmd start)
    - 16-byte random hex state for CSRF protection
    - 120-second timeout with server.close() in all exit paths

key-files:
  created:
    - src/oauth/oauth-flow.ts
    - src/commands/auth/login.ts
    - src/commands/auth/logout.ts
    - src/commands/auth/status.ts
  modified:
    - src/cli.ts

key-decisions:
  - "Manual flow reads pasted redirect URL from stdin (readline) — allows headless/CI environments"
  - "Browser open failure auto-triggers manual flow — no crash on headless systems"
  - "TTY check in login: non-TTY without --manual throws AUTH_NO_TOKEN rather than hanging"
  - "Logout preserves internal integration token — only clears OAuth fields"
  - "auth status shows both OAuth and internal token state with active method attribution"

patterns-established:
  - "Auth command pattern: resolve profile (--profile flag > active_profile > 'default'), then act"
  - "OAuth loopback: server listens on 127.0.0.1:54321 matching OAUTH_REDIRECT_URI"

requirements-completed:
  - OAUTH-04
  - OAUTH-05
  - OAUTH-06

# Metrics
duration: 9min
completed: 2026-02-27
---

# Phase 8 Plan 02: OAuth Browser Flow + Auth Commands Summary

**Browser-based OAuth loopback flow with localhost:54321 callback server, plus `notion auth login/logout/status` subcommand group with profile support and manual fallback for headless environments**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-02-27T21:51:21Z
- **Completed:** 2026-02-27T22:00:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- OAuth loopback flow module: starts HTTP server on localhost:54321, opens browser, validates CSRF state, handles timeout and access_denied errors, falls back to manual URL/paste flow
- `notion auth login`: full OAuth flow → token exchange → profile save, with TTY guard and --manual flag for headless environments
- `notion auth logout`: clears OAuth tokens only, preserves internal integration token, shows informative message
- `notion auth status`: rich status display showing OAuth login state, token expiry, internal token presence, and active attribution method
- Auth subcommand group wired into `src/cli.ts` before other command groups

## Task Commits

Each task was committed atomically:

1. **Task 1: OAuth loopback flow module** - `a2617b3` (feat)
2. **Task 2: auth login/logout/status commands + CLI wiring** - `8539b7f` (feat)

## Files Created/Modified
- `src/oauth/oauth-flow.ts` - runOAuthFlow() with HTTP server, browser open, CSRF, timeout, manual fallback
- `src/commands/auth/login.ts` - notion auth login with --profile and --manual flags
- `src/commands/auth/logout.ts` - notion auth logout; clears OAuth tokens only
- `src/commands/auth/status.ts` - notion auth status; shows full auth state for profile
- `src/cli.ts` - auth subcommand group (login/logout/status) added near top

## Decisions Made
- TTY check in login command: if `!process.stdin.isTTY && !opts.manual`, throw `AUTH_NO_TOKEN` — prevents hanging in piped/CI environments
- Browser open failure auto-falls-back to manual flow — no hard failure on headless servers; server.close() called before entering manual path
- Manual flow uses readline on stdin; pasted URL is parsed with `new URL()` — extracts code and state from any valid redirect URL
- `notion auth logout` re-reads config to check for OAuth session before attempting clear — prevents misleading success messages
- Profile resolution in all auth commands: `--profile` flag > `active_profile` from config > `'default'`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `src/blocks/md-to-blocks.ts` (RichTextItemRequest not exported from @notionhq/client). Pre-existing from 08-01; unrelated to this plan. Build via tsup succeeds regardless.

## User Setup Required

**OAuth credentials still need replacement.** The `src/oauth/oauth-client.ts` contains XOR-encoded placeholder values (`PLACEHOLDER_CLIENT_ID`, `PLACEHOLDER_CLIENT_SECRET`).

Before end-to-end OAuth testing can complete:
1. Register a **public** Notion integration at https://www.notion.so/profile/integrations
2. Generate XOR-encoded chunks for real `client_id` and `client_secret` using the script in the file header
3. Replace encoded chunks in `src/oauth/oauth-client.ts`

`notion auth status` and `notion auth logout` work immediately without credentials. `notion auth login` will reach the Notion OAuth page but the token exchange will fail until real credentials are set.

## Next Phase Readiness
- Ready for 08-03: documentation update (README OAuth section, agent skill update)
- OAuth flow is fully wired; only credentials and docs remain
- `notion auth status` confirmed working with real profile config — shows internal token correctly

---
*Phase: 08-oauth-login*
*Completed: 2026-02-27*
