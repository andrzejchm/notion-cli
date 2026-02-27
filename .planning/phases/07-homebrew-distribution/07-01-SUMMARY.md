---
phase: 07-homebrew-distribution
plan: "01"
subsystem: infra
tags: [homebrew, tap, formula, npm, node, distribution]

# Dependency graph
requires:
  - phase: 05-agent-distribution
    provides: "@andrzejchm/notion-cli npm package published at v0.1.2"
provides:
  - "Homebrew tap at github.com/andrzejchm/homebrew-notion-cli"
  - "Formula/notion-cli.rb: installs notion-cli from npm tarball via std_npm_args"
  - "brew tap andrzejchm/notion-cli + brew install notion-cli works end-to-end"
affects: [07-homebrew-distribution, README updates]

# Tech tracking
tech-stack:
  added: [homebrew formula (Ruby DSL), std_npm_args pattern]
  patterns:
    - "npm tarball formula: url from registry.npmjs.org + sha256 + depends_on node + std_npm_args + bin.install_symlink"

key-files:
  created:
    - homebrew-notion-cli/Formula/notion-cli.rb
    - homebrew-notion-cli/README.md
  modified: []

key-decisions:
  - "std_npm_args pattern used for npm-tarball formula: installs into libexec, symlinks bin/ entries — no npm global install required"
  - "brew link --overwrite required when notion binary already exists from npm global install"

patterns-established:
  - "npm-tarball Homebrew formula: class inherits Formula, depends_on node, std_npm_args, bin.install_symlink Dir[libexec/bin/*]"

requirements-completed: [ADV-04]

# Metrics
duration: 2min
completed: "2026-02-27"
---

# Phase 7 Plan 01: Homebrew Distribution Summary

**Homebrew tap with npm-tarball formula: `brew tap andrzejchm/notion-cli && brew install notion-cli` installs notion 0.1.2 with no npm required**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T19:47:15Z
- **Completed:** 2026-02-27T19:49:00Z
- **Tasks:** 3 (1 skipped/pre-done, 2 executed)
- **Files modified:** 2

## Accomplishments
- Homebrew formula created at `Formula/notion-cli.rb` using std_npm_args pattern — installs from npm registry tarball with node as the only dependency
- README.md updated with tap + install + usage instructions
- `brew tap andrzejchm/notion-cli && brew install notion-cli` verified working: `notion --version` prints `0.1.2`
- `notion --help` shows all CLI commands (init, profile, search, ls, open, users, comments, page, db, write, create)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create homebrew-notion-cli GitHub repository** - `aa6d197` (pre-created via `gh repo create`)
2. **Task 2: Write the Homebrew formula and tap README** - `d50eb6f` (feat: notion-cli 0.1.2 formula) — pushed to github.com/andrzejchm/homebrew-notion-cli
3. **Task 3: Verify brew install works end-to-end** - (verification-only, no new commits)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `homebrew-notion-cli/Formula/notion-cli.rb` - Homebrew formula; installs @andrzejchm/notion-cli 0.1.2 from npm tarball via std_npm_args
- `homebrew-notion-cli/README.md` - Tap instructions: brew tap + brew install + brew upgrade

## Decisions Made
- Used `std_npm_args` pattern (expands to `--global --build-from-source --cache=... --prefix=#{libexec}`) — standard for npm-based Homebrew formulae
- `bin.install_symlink Dir["#{libexec}/bin/*"]` — symlinks all bin entries from libexec into brew's bin directory
- No `require "language/node"` needed in modern Homebrew — `std_npm_args` is available directly on Formula

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `brew link --overwrite` required for existing npm global install**
- **Found during:** Task 3 (brew install verification)
- **Issue:** `notion` binary already existed at `/opt/homebrew/bin/notion` (symlink from npm global install), causing `brew link` step to fail with conflict error
- **Fix:** Ran `brew link --overwrite notion-cli` to replace the npm symlink with the brew-managed one
- **Files modified:** None (symlink management only)
- **Verification:** `notion --version` → `0.1.2`; `brew info` shows formula installed and linked
- **Committed in:** N/A (no file changes needed)

---

**Total deviations:** 1 auto-fixed (link conflict from existing npm global install)
**Impact on plan:** Trivial one-liner fix. No scope change. Users without npm global install will not encounter this.

## Verification Results (Task 3)

Commands run and output:

```
$ brew tap andrzejchm/notion-cli /Users/andrzejchm/Developer/homebrew-notion-cli
==> Tapping andrzejchm/notion-cli
Tapped 1 formula (20 files, 10.1KB).

$ brew install --formula andrzejchm/notion-cli/notion-cli
🍺  /opt/homebrew/Cellar/notion-cli/0.1.2: 566 files, 2.7MB, built in 6 seconds

$ notion --version
0.1.2

$ notion --help
Usage: notion [options] [command]
Notion CLI — read Notion pages and databases from the terminal
[...all commands visible...]
```

**Status:** ✅ PASS — `brew install andrzejchm/notion-cli/notion-cli` installs a working `notion` binary without npm.

## Issues Encountered
- Pre-existing `notion` symlink from npm global install caused `brew link` conflict → resolved with `--overwrite`. Expected behavior when npm and brew installs coexist.

## User Setup Required
None — tap is live at https://github.com/andrzejchm/homebrew-notion-cli. Users can run:
```bash
brew tap andrzejchm/notion-cli
brew install notion-cli
```

## Next Phase Readiness
- Phase 7 Plan 02 (auto-update GH Actions workflow + README brew docs) is ready to execute
- Formula is live and working — the auto-update workflow will keep sha256/version current on each npm publish

---
*Phase: 07-homebrew-distribution*
*Completed: 2026-02-27*

## Self-Check: PASSED

- ✅ `homebrew-notion-cli/Formula/notion-cli.rb` — found
- ✅ `homebrew-notion-cli/README.md` — found
- ✅ `07-01-SUMMARY.md` — found at `.planning/phases/07-homebrew-distribution/`
- ✅ Commit `d50eb6f` (notion-cli 0.1.2 formula) — found in homebrew-notion-cli git log
- ✅ `notion --version` → `0.1.2` — verified
