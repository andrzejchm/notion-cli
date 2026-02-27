---
phase: 08-oauth-login
plan: 01
subsystem: auth
tags: [oauth, jwt, token, typescript, fetch]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: ProfileConfig type, GlobalConfig, readGlobalConfig/writeGlobalConfig, resolveToken, CliError, ErrorCodes
provides:
  - Extended ProfileConfig with oauth_access_token, oauth_refresh_token, oauth_expiry_ms, oauth_user_id, oauth_user_name
  - OAuthClient module with buildAuthUrl(), exchangeCode(), refreshAccessToken()
  - token-store.ts with saveOAuthTokens(), clearOAuthTokens()
  - resolveToken() auto-prefers OAuth access token and auto-refreshes expired tokens
affects: [08-02-auth-commands, 08-03-docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - XOR-obfuscated bundled OAuth credentials split across string arrays
    - Conservative 1-hour expiry for OAuth tokens (Notion omits expires_in)
    - Transparent refresh-on-expiry in token resolution chain
    - Merge semantics for OAuth token persistence (preserves internal .token field)

key-files:
  created:
    - src/oauth/oauth-client.ts
    - src/oauth/token-store.ts
  modified:
    - src/types/config.ts
    - src/config/token.ts

key-decisions:
  - "ProfileConfig.token made optional (not all profiles have internal integration token)"
  - "OAuth credentials XOR-encoded + split per RFC 8252 rationale (not secret in native apps; real boundary is redirect URI lock)"
  - "Conservative 1-hour expiry stored since Notion omits expires_in for public integrations"
  - "resolveToken() returns source:'oauth' to distinguish from internal token for callers"
  - "clearOAuthTokens() used as recovery path when refresh fails — avoids leaving stale tokens"

patterns-established:
  - "Token resolution: env > .notion.yaml direct > .notion.yaml profile (OAuth first) > active_profile (OAuth first)"
  - "OAuth token save merges with existing profile (preserves .token field for internal integrations)"

requirements-completed:
  - OAUTH-01
  - OAUTH-02
  - OAUTH-03

# Metrics
duration: 8min
completed: 2026-02-27
---

# Phase 8 Plan 01: OAuth Type System, Client Module, and Token Resolver Summary

**Extended ProfileConfig with OAuth fields, bundled OAuth client with XOR-obfuscated credentials, and updated resolveToken() that auto-prefers and auto-refreshes OAuth access tokens**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-27T21:46:17Z
- **Completed:** 2026-02-27T21:54:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ProfileConfig extended with 5 OAuth fields (access_token, refresh_token, expiry_ms, user_id, user_name) while keeping token optional for backward compatibility
- OAuth client module created with XOR-obfuscated bundled credentials and full exchange/refresh flow using fetch() with Basic auth
- token-store.ts provides merge-safe persistence and selective clearing of OAuth tokens
- resolveToken() updated to prefer OAuth tokens, auto-refresh on expiry, and fall back to internal token if no OAuth present

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ProfileConfig type and OAuth module scaffold** - `c89327e` (feat)
2. **Task 2: Update resolveToken() to prefer OAuth access token with auto-refresh** - `ed7f8a3` (feat)

## Files Created/Modified
- `src/types/config.ts` - Extended ProfileConfig with oauth fields; token made optional; added 'oauth' source to TokenResult
- `src/oauth/oauth-client.ts` - XOR-obfuscated bundled credentials, buildAuthUrl(), exchangeCode(), refreshAccessToken()
- `src/oauth/token-store.ts` - saveOAuthTokens() and clearOAuthTokens() backed by readGlobalConfig/writeGlobalConfig
- `src/config/token.ts` - resolveOAuthToken() helper, isOAuthExpired() check, full auto-refresh with fallback

## Decisions Made
- `ProfileConfig.token` changed from required to optional — profiles created via OAuth flow won't have an internal integration token
- OAuth credentials bundled using XOR obfuscation per RFC 8252: native app client secrets are not truly secret; real security is Notion's redirect URI lock
- Conservative 1-hour expiry (`Date.now() + 60 * 60 * 1000`) because Notion omits `expires_in` for public integrations
- `resolveToken()` returns `source: 'oauth'` so callers can distinguish OAuth-attributed operations from internal integration operations
- On refresh failure: tokens are cleared via `clearOAuthTokens()` before throwing `AUTH_NO_TOKEN` to prevent stale state

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `src/blocks/md-to-blocks.ts` (RichTextItemRequest not exported from @notionhq/client). This is unrelated to this plan and was present before execution. Build via `npm run build` (tsup) succeeds regardless — tsup doesn't surface this SDK internal type issue.

## User Setup Required

**OAuth credentials require replacement.** The current `src/oauth/oauth-client.ts` contains XOR-encoded placeholder values:
- `PLACEHOLDER_CLIENT_ID`
- `PLACEHOLDER_CLIENT_SECRET`

Before the OAuth flow can complete, the developer must:
1. Register a **public** Notion integration at https://www.notion.so/profile/integrations
2. Generate XOR-encoded chunks for the real `client_id` and `client_secret` using the script in the file header
3. Replace the encoded chunks in `src/oauth/oauth-client.ts`

## Next Phase Readiness
- Ready for 08-02: loopback auth flow + `notion auth login/logout/status` commands
- Token types and store are fully set up; commands only need to call `buildAuthUrl()`, open browser, run local HTTP server for callback, and call `saveOAuthTokens()`
- Blocker: Real OAuth credentials needed before end-to-end testing

---
*Phase: 08-oauth-login*
*Completed: 2026-02-27*
