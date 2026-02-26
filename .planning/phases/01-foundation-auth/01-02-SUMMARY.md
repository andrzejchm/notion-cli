---
phase: 01-foundation-auth
plan: 02
subsystem: auth
tags: [typescript, yaml, xdg, config, token-resolution, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: "CliError class, ErrorCodes, GlobalConfig/LocalConfig/TokenResult types"
provides:
  - XDG-aware config path resolution (getConfigDir, getConfigPath)
  - Atomic global config YAML read/write with 0700 dir + 0600 file permissions
  - Local .notion.yaml reading with profile XOR token validation
  - Token resolution chain: env > .notion.yaml > active profile with source reporting
  - 20 passing tests covering paths, config read/write, and full token resolution
affects:
  - 01-03 (notion init/profile commands will call writeGlobalConfig, resolveToken)
  - All authenticated commands (resolveToken is the standard auth method)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Atomic write pattern: mkdir 0700 + writeFile to .tmp 0600 + rename (POSIX atomic)
    - Token source reporting pattern: TokenResult.source distinguishes env/local/profile
    - XDG-aware path resolution: $XDG_CONFIG_HOME with ~/.config fallback
    - vi.mock for module-level dependency injection in vitest tests
    - Direct env var reads at call time (not module load time) — no re-import needed

key-files:
  created:
    - src/config/paths.ts (getConfigDir, getConfigPath — XDG-aware)
    - src/config/config.ts (readGlobalConfig, writeGlobalConfig — atomic YAML I/O)
    - src/config/local-config.ts (readLocalConfig — .notion.yaml with validation)
    - src/config/token.ts (resolveToken — layered token lookup with source)
    - tests/config/paths.test.ts (5 tests)
    - tests/config/config.test.ts (5 tests)
    - tests/config/token.test.ts (9 tests + 1 local-config test)
  modified: []

key-decisions:
  - "Atomic write: mkdir(0700) + writeFile(tmp, 0600) + rename — matches research pattern"
  - "getConfigDir() reads env at call time (not module init) — testable without re-importing"
  - "vi.mock() for readGlobalConfig/readLocalConfig in token tests — pure unit tests, no filesystem"
  - "readGlobalConfig returns {} (not null) on ENOENT — simplifies all callers"
  - "readLocalConfig validates profile XOR token with CONFIG_INVALID — catches misconfiguration early"

patterns-established:
  - "Config Pattern: readGlobalConfig() returns {} on ENOENT (never null), callers use ?. for optional fields"
  - "Token Pattern: resolveToken() always returns TokenResult or throws AUTH_NO_TOKEN"
  - "Test Pattern: vi.mock() deps at module level, vi.mocked() for typed access, clearAllMocks() in afterEach"

requirements-completed:
  - AUTH-03
  - AUTH-04

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 1 Plan 02: Config Management Summary

**XDG-aware config paths, atomic YAML read/write with 0600 permissions, local .notion.yaml validation, and layered token resolution (env > local > profile) — 20 tests all passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T21:42:22Z
- **Completed:** 2026-02-26T21:44:12Z
- **Tasks:** 2
- **Files modified:** 7 created

## Accomplishments
- `getConfigDir()` respects `$XDG_CONFIG_HOME` with `~/.config/notion-cli` fallback
- `readGlobalConfig()` / `writeGlobalConfig()` with atomic write pattern (0700 dir, 0600 file, tmp rename)
- `readLocalConfig()` validates `.notion.yaml` — throws CONFIG_INVALID when both `profile` and `token` specified
- `resolveToken()` implements full precedence chain: env → .notion.yaml token → .notion.yaml profile → active_profile
- 20 tests covering all resolution paths, edge cases, and file I/O

## Task Commits

Each task was committed atomically:

1. **Task 1: Config paths, global config read/write, and local config** - `8c5ed54` (feat)
2. **Task 2: Token resolution chain with tests** - `8a83bcc` (feat)

## Files Created/Modified
- `src/config/paths.ts` - XDG-aware `getConfigDir()` and `getConfigPath()`
- `src/config/config.ts` - `readGlobalConfig()` / `writeGlobalConfig()` with atomic write
- `src/config/local-config.ts` - `readLocalConfig()` reading `.notion.yaml` with profile XOR token validation
- `src/config/token.ts` - `resolveToken()` layered lookup returning `TokenResult` with source
- `tests/config/paths.test.ts` - 5 tests for path resolution with env var control
- `tests/config/config.test.ts` - 5 tests including round-trip and 0600 permissions check
- `tests/config/token.test.ts` - 9 tests covering all token resolution paths and precedence

## Decisions Made
- `readGlobalConfig()` returns `{}` (not `null`) on ENOENT — simplifies all callers with `?.` optional chaining
- `getConfigDir()` reads `process.env.XDG_CONFIG_HOME` at call time, not module load time — makes it directly testable without re-importing
- Used `vi.mock()` to inject mocked config deps in token tests — pure unit tests, no filesystem I/O
- Atomic write: `mkdir(0o700)` + `writeFile(tmp, { mode: 0o600 })` + `rename` — standard POSIX atomicity pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced cache-busting dynamic import approach in paths tests**
- **Found during:** Task 2 (paths.test.ts execution)
- **Issue:** Initial paths test used `import(\`...?t=${Date.now()}\`)` to force re-import for env var changes — vitest rejects variable dynamic imports with "Unknown variable dynamic import" error
- **Fix:** Since `getConfigDir()` reads `process.env` at call time (not module load time), simply set/delete `process.env.XDG_CONFIG_HOME` in tests and call the imported function directly — no re-import needed
- **Files modified:** tests/config/paths.test.ts
- **Verification:** All 5 paths tests pass
- **Committed in:** 8a83bcc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test approach)
**Impact on plan:** Required for test correctness. Simpler approach than cache-busting imports. No scope creep.

## Issues Encountered
- Vitest doesn't support variable expressions in dynamic `import()` paths — attempted `import(\`path?t=${Date.now()}\`)` cache-busting fails. Resolution: functions reading env vars at call time don't need re-import tricks.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config infrastructure is complete — `notion init` command can use `writeGlobalConfig()` and `readGlobalConfig()`
- `resolveToken()` is the standard auth method for all authenticated commands
- All 20 tests passing, build producing clean output
- `src/config/` directory is fully established as the config subsystem

## Self-Check: PASSED

All files verified present:
- `src/config/paths.ts` ✓
- `src/config/config.ts` ✓
- `src/config/local-config.ts` ✓
- `src/config/token.ts` ✓
- `tests/config/paths.test.ts` ✓
- `tests/config/config.test.ts` ✓
- `tests/config/token.test.ts` ✓
- `.planning/phases/01-foundation-auth/01-02-SUMMARY.md` ✓

Commits verified:
- `8c5ed54` ✓ (Task 1: config paths, global config, local config)
- `8a83bcc` ✓ (Task 2: token resolution + all tests)

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-26*
