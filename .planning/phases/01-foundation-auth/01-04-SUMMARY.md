---
phase: 01-foundation-auth
plan: 04
subsystem: auth
tags: [notion-api, commander, inquirer, typescript, cli, shell-completion]

# Dependency graph
requires:
  - phase: 01-02
    provides: readGlobalConfig/writeGlobalConfig for profile persistence, resolveToken for auth chain
  - phase: 01-01
    provides: CliError, withErrorHandling, error-handler infrastructure
provides:
  - "validateToken() — calls users.me() to verify Notion integration token and return workspace name/id"
  - "createNotionClient() — factory for authenticated Notion API Client instances"
  - "notion init — interactive TTY prompt flow: profile name → token → validation → save"
  - "notion profile list/use/remove — full profile management commands"
  - "notion completion bash/zsh/fish — shell completion script generation"
  - "src/cli.ts — fully wired CLI with all Phase 1 commands registered"
affects: [all future phases that create Notion API calls, phase 02 and beyond]

# Tech tracking
tech-stack:
  added: ["@notionhq/client (users.me for token validation)", "@inquirer/prompts (input, password, confirm)"]
  patterns:
    - "Token validation via users.me() before saving profile — fail fast, never store invalid tokens"
    - "Non-TTY guard on init command — provides env var/yaml guidance"
    - "withErrorHandling wraps all command actions for consistent stderr error output"
    - "Profile management: atomic read-modify-write via writeGlobalConfig"

key-files:
  created:
    - src/notion/client.ts
    - src/commands/init.ts
    - src/commands/profile/list.ts
    - src/commands/profile/use.ts
    - src/commands/profile/remove.ts
    - src/commands/completion.ts
  modified:
    - src/cli.ts
    - src/errors/error-handler.ts

key-decisions:
  - "Notion integrations URL is https://www.notion.so/profile/integrations/internal (not /my-integrations)"
  - "withErrorHandling generalized to accept typed args to support commands with positional arguments"
  - "completion command outputs static scripts — simple and deterministic, grows as commands are added"

patterns-established:
  - "Command pattern: each command file exports a factory function returning a Commander Command"
  - "Profile save pattern: validateToken() → check existing → confirm replace → writeGlobalConfig()"
  - "All command actions wrapped with withErrorHandling for consistent error output to stderr"

requirements-completed: [AUTH-01, AUTH-02, DIST-03]

# Metrics
duration: 15min
completed: 2026-02-26
---

# Phase 1 Plan 04: CLI Commands — Init, Profile Management, and Shell Completions Summary

**Full CLI auth flow: notion init with Notion token validation via users.me(), profile management (list/use/remove), and bash/zsh/fish completion scripts**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-26T21:48:00Z
- **Completed:** 2026-02-26T22:54:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- `notion init` interactive flow with TTY detection, token validation against Notion API, and profile saving
- Full profile management: `notion profile list` (with active marker + workspace name), `use`, and `remove`
- Shell completions for bash, zsh, and fish covering all Phase 1 commands
- All commands wired into cli.ts with consistent error handling via `withErrorHandling`

## Task Commits

Each task was committed atomically:

1. **Task 1: Notion client factory and init/profile commands** - `0b5a174` (feat)
2. **Task 2: CLI wiring, completion command, and build verification** - `2320d3d` (feat)
3. **Task 3: Verify complete CLI interactive flow** - `2a71444` (fix — URL correction)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/notion/client.ts` - `validateToken()` calls users.me(), `createNotionClient()` factory
- `src/commands/init.ts` - Interactive init: TTY check, prompts, token validation, profile save
- `src/commands/profile/list.ts` - Lists all profiles with active marker and workspace name
- `src/commands/profile/use.ts` - Switches active profile by name
- `src/commands/profile/remove.ts` - Removes profile, unsets active if needed
- `src/commands/completion.ts` - Static bash/zsh/fish completion scripts for all Phase 1 commands
- `src/cli.ts` - All commands registered: init, profile group, completion
- `src/errors/error-handler.ts` - Generalized to accept typed args for commands with positional arguments

## Decisions Made
- Notion integrations URL corrected to `https://www.notion.so/profile/integrations/internal` (user correction during verify checkpoint)
- `withErrorHandling` generalized to `withErrorHandling<T extends unknown[]>` to support commands with positional arguments
- Shell completions are static strings — simple, predictable, easily extended as more commands are added in future phases

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect Notion integrations URL**
- **Found during:** Task 3 (Verify complete CLI interactive flow) — user correction during human-verify checkpoint
- **Issue:** Plan specified `notion.so/my-integrations` but correct URL is `https://www.notion.so/profile/integrations/internal`
- **Fix:** Updated URL in both `src/notion/client.ts` (AUTH_INVALID error suggestion) and `src/commands/init.ts` (prompt message)
- **Files modified:** src/notion/client.ts, src/commands/init.ts
- **Verification:** User approved after fix, confirmed correct URL
- **Committed in:** 2a71444 (fix(01-04): correct Notion integrations URL to /profile/integrations/internal)

**2. [Rule 1 - Bug] Generalized withErrorHandling to support typed args**
- **Found during:** Task 2 (CLI wiring) — profile use/remove commands take positional arguments
- **Issue:** Original `withErrorHandling(fn: () => Promise<void>)` only accepts zero-arg functions; profile use/remove need to pass `<name>` argument
- **Fix:** Generalized signature to `withErrorHandling<T extends unknown[]>(fn: (...args: T) => Promise<void>): (...args: T) => Promise<void>`
- **Files modified:** src/errors/error-handler.ts
- **Verification:** All commands with args compile and run correctly
- **Committed in:** 2320d3d (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug — wrong URL, 1 bug — type signature)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None — plan executed as written with the two auto-fixes above.

## User Setup Required
None - no external service configuration required beyond having a Notion integration token (covered by `notion init` UX).

## Next Phase Readiness
- Phase 1 complete: project scaffold, config management, URL/ID parsing, and full CLI auth flow all ship
- `validateToken()` and `createNotionClient()` are ready for use by all future read/write commands
- Token resolution chain (env > .notion.yaml > active_profile) is the standard pattern for all subsequent commands
- Phase 2 (Search & Navigation) can proceed — all auth infrastructure is in place

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-26*
