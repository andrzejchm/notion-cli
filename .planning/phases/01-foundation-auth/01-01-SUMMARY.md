---
phase: 01-foundation-auth
plan: 01
subsystem: infra
tags: [typescript, commander, tsup, vitest, chalk, cli, error-handling]

# Dependency graph
requires: []
provides:
  - Buildable TypeScript CLI project with ESM module system
  - Working `notion --version` and `notion --help` commands
  - CliError class with structured error codes and formatted output
  - withErrorHandling() wrapper for async command actions
  - TTY-aware color utilities (respects NO_COLOR, --color flag)
  - Stderr utilities for error and token source reporting
  - TypeScript types: GlobalConfig, ProfileConfig, LocalConfig, TokenResult
affects:
  - 01-02 (auth/init commands use withErrorHandling, CliError, ErrorCodes)
  - All future command plans (withErrorHandling is the standard wrapper)

# Tech tracking
tech-stack:
  added:
    - commander@^14.0.0 (CLI framework)
    - "@notionhq/client@^5.10.0" (Notion API SDK)
    - chalk@^5.6.0 (TTY-aware color output)
    - yaml@^2.8.0 (config YAML parsing)
    - "@inquirer/prompts@^8.3.0" (interactive prompts)
    - tsup@^8.5.0 (ESM bundler with shebang support)
    - vitest@^4.0.0 (test framework)
    - typescript@~5.9.0
    - "@commander-js/extra-typings@^14.0.0"
  patterns:
    - ESM-first project with "type:module" in package.json
    - tsup with shebang banner for direct CLI execution
    - Structured error codes as const object with ErrorCode type
    - CliError extends Error with format() producing [CODE] message → suggestion
    - withErrorHandling lazy-imports @notionhq/client to keep startup fast
    - Chalk instance created per-call with TTY-based level selection

key-files:
  created:
    - package.json (project metadata, ESM, bin field)
    - tsconfig.json (strict TypeScript, Node16 module resolution)
    - tsup.config.ts (ESM bundler with shebang banner)
    - vitest.config.ts (test config with passWithNoTests)
    - src/cli.ts (Commander entry point with --version, --verbose, --color)
    - src/types/config.ts (GlobalConfig, ProfileConfig, LocalConfig, TokenResult)
    - src/errors/codes.ts (ErrorCodes constants)
    - src/errors/cli-error.ts (CliError class)
    - src/errors/error-handler.ts (withErrorHandling wrapper)
    - src/output/color.ts (Chalk TTY wrapper, error/success/dim/bold helpers)
    - src/output/stderr.ts (stderrWrite, reportTokenSource, reportError)
    - .gitignore
  modified: []

key-decisions:
  - "ESM-only project: type:module required for chalk v5, @notionhq/client v5, @inquirer/prompts compatibility"
  - "tsup with shebang banner ensures dist/cli.js is directly executable"
  - "CliError format: [CODE] message\\n  → suggestion (matches research Pattern 3)"
  - "withErrorHandling lazy-imports @notionhq/client to keep notion --help startup fast"
  - "Chalk.Instance with level:0 for non-TTY (not identity functions — simpler)"
  - "passWithNoTests:true in vitest so npm test passes before any test files exist"

patterns-established:
  - "Error Pattern: All commands wrap action with withErrorHandling(() => Promise<void>)"
  - "Color Pattern: createChalk() called per invocation, respects NO_COLOR env and --color flag"
  - "Import Pattern: ESM imports with .js extensions in source (Node16 moduleResolution)"

requirements-completed:
  - OUT-05
  - DIST-02
  - DIST-04

# Metrics
duration: 12min
completed: 2026-02-26
---

# Phase 1 Plan 01: Project Scaffold and Error Infrastructure Summary

**ESM TypeScript CLI skeleton with Commander, tsup bundling, CliError structured errors, and TTY-aware chalk output — `notion --version` works, all error infrastructure ready for auth commands**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-26T21:37:03Z
- **Completed:** 2026-02-26T21:49:00Z
- **Tasks:** 2
- **Files modified:** 11 created

## Accomplishments
- Buildable ESM TypeScript CLI project producing `dist/cli.js` with shebang
- `notion --version` (0.1.0), `--help`, `--verbose`, `--color` all working
- CliError class with error code constants and `format()` producing `[CODE] message\n  → suggestion`
- withErrorHandling wrapper with lazy Notion SDK import and mapped error codes
- TTY-aware color utilities via chalk v5 ESM, respecting NO_COLOR and --color flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffold — package.json, TypeScript, tsup, vitest** - `daca1e4` (chore)
2. **Task 2: Error handling system and output utilities** - `ed3c6e1` (feat)

## Files Created/Modified
- `package.json` - ESM project metadata with bin field, all dependencies
- `tsconfig.json` - Strict TypeScript with Node16 module resolution
- `tsup.config.ts` - ESM bundler config with `#!/usr/bin/env node` shebang banner
- `vitest.config.ts` - Test framework config with globals and passWithNoTests
- `src/cli.ts` - Commander entry point with global options and parseAsync
- `src/types/config.ts` - TypeScript interfaces for GlobalConfig, ProfileConfig, LocalConfig, TokenResult
- `src/errors/codes.ts` - ErrorCodes const object with ErrorCode union type
- `src/errors/cli-error.ts` - CliError class extending Error with code + suggestion + format()
- `src/errors/error-handler.ts` - withErrorHandling wrapping async actions, maps Notion SDK errors
- `src/output/color.ts` - Chalk wrapper with TTY detection, setColorForced(), helper functions
- `src/output/stderr.ts` - stderrWrite, reportTokenSource, reportError utilities
- `.gitignore` - Excludes node_modules, dist, maps

## Decisions Made
- ESM-only (`type: module`) required for chalk v5, @notionhq/client v5, @inquirer/prompts
- `Chalk({ level: 0 })` for non-TTY rather than identity functions — simpler, same result
- Lazy import of `@notionhq/client` in error-handler.ts preserves fast startup for `--help`/`--version`
- `passWithNoTests: true` in vitest so CI doesn't fail on empty test suites

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed chalk v5 API usage (Instance vs Chalk constructor)**
- **Found during:** Task 2 (color utilities)
- **Issue:** Plan referenced `chalk.Instance` which doesn't exist in chalk v5 ESM exports — `Chalk` is the named class export
- **Fix:** Changed `new chalk.Instance({ level: 0 })` to `import { Chalk }` and `new Chalk({ level })`
- **Files modified:** src/output/color.ts
- **Verification:** `npx tsc --noEmit` passed with zero errors
- **Committed in:** ed3c6e1 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added passWithNoTests to vitest config**
- **Found during:** Task 2 verification (npm test)
- **Issue:** `npm test` exited with code 1 when no test files existed — would break CI and plan verification
- **Fix:** Added `passWithNoTests: true` to vitest.config.ts
- **Files modified:** vitest.config.ts
- **Verification:** `npm test` exits with code 0
- **Committed in:** ed3c6e1 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both necessary for correctness. No scope creep.

## Issues Encountered
- chalk v5 ESM API uses `Chalk` named class (not `chalk.Instance`) — TypeScript caught it at type-check time

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All infrastructure ready for auth command implementation (notion init, notion profile)
- withErrorHandling is the standard wrapper for all future command actions
- TypeScript types defined for all config structures
- Build pipeline produces executable dist/cli.js

## Self-Check: PASSED

All files verified:
- `src/cli.ts` ✓
- `src/types/config.ts` ✓
- `src/errors/codes.ts` ✓
- `src/errors/cli-error.ts` ✓
- `src/errors/error-handler.ts` ✓
- `src/output/color.ts` ✓
- `src/output/stderr.ts` ✓
- `.planning/phases/01-foundation-auth/01-01-SUMMARY.md` ✓

Commits verified:
- `daca1e4` ✓ (Task 1: project scaffold)
- `ed3c6e1` ✓ (Task 2: error handling system)

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-26*
