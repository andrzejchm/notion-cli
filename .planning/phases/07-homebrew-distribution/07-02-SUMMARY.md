---
phase: 07-homebrew-distribution
plan: "02"
subsystem: infra
tags: [homebrew, github-actions, auto-update, readme, documentation, distribution]

# Dependency graph
requires:
  - phase: 07-homebrew-distribution
    plan: "01"
    provides: "Homebrew tap with Formula/notion-cli.rb at github.com/andrzejchm/homebrew-notion-cli"
provides:
  - "homebrew-notion-cli/.github/workflows/update-formula.yml: daily cron + manual dispatch workflow to keep formula sha256/version current"
  - "README.md: Homebrew install section with brew tap as recommended path + homebrew badge"
affects: [07-homebrew-distribution, README, homebrew-notion-cli]

# Tech tracking
tech-stack:
  added: [GitHub Actions workflow (YAML), schedule cron trigger, workflow_dispatch, actions/checkout@v4]
  patterns:
    - "npm-tarball auto-update: curl registry.npmjs.org/latest → compare versions → curl tarball | shasum -a 256 → sed in-place → git commit + push"

key-files:
  created:
    - homebrew-notion-cli/.github/workflows/update-formula.yml
  modified:
    - README.md

key-decisions:
  - "Workflow uses `grep -oP` (Perl regex) to extract current version from formula URL — works on ubuntu-latest"
  - "Workflow skips commit when already up-to-date (up_to_date=true guard) — avoids empty commits on daily runs"
  - "Homebrew badge placed immediately after npm version badge — groups install-related badges together"
  - "brew tap + brew install shown as recommended path; npm as alternative — matches plan requirement"

patterns-established:
  - "npm-tarball formula auto-update pattern: schedule + workflow_dispatch + version diff check + sha256 recompute + sed in-place + git push"

requirements-completed: [ADV-04]

# Metrics
duration: ~2min
completed: "2026-02-27"
---

# Phase 7 Plan 02: Auto-Update Workflow + README Homebrew Docs Summary

**GH Actions daily cron auto-updates the formula sha256/version on new npm releases; README updated with `brew tap andrzejchm/notion-cli && brew install notion-cli` as the recommended install path**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T19:51:41Z
- **Completed:** 2026-02-27T19:53:09Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-verified)
- **Files modified:** 2

## Accomplishments

- Created `.github/workflows/update-formula.yml` in homebrew-notion-cli: daily schedule (08:00 UTC) + manual dispatch; checks npm registry, computes sha256 from tarball, updates formula and pushes if version changed
- First manual workflow run triggered via `gh workflow run` — completed successfully in 11s (formula confirmed up-to-date)
- Updated `README.md` in notion-cli repo: Homebrew badge added next to npm badge; install snippet now shows `brew tap` + `brew install` as recommended path, npm as alternative
- Both changes committed and pushed to their respective repos

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auto-update GitHub Actions workflow** — `caa2a3e` (chore: add auto-update workflow) → pushed to github.com/andrzejchm/homebrew-notion-cli
2. **Task 2: Update notion-cli README with Homebrew install section** — `1209e38` (docs(07-02): add Homebrew install instructions to README) → pushed to github.com/andrzejchm/notion-cli
3. **Task 3: Verify auto-update workflow and README** — (verification-only, no new commits)

## Files Created/Modified

- `homebrew-notion-cli/.github/workflows/update-formula.yml` — Auto-update workflow: daily cron + manual dispatch; polls npm registry, computes sha256, commits updated formula if new version detected
- `README.md` — Homebrew badge + `brew tap`/`brew install` as recommended install path alongside existing npm path

## Decisions Made

- Used `grep -oP '\d+\.\d+\.\d+'` (Perl-mode regex) to extract current version from formula URL on ubuntu-latest — reliable and requires no extra tools
- `up_to_date=true` guard skips the update step to avoid empty commits on daily runs when no new version is published
- Homebrew badge placed immediately after npm version badge for visual grouping
- `brew tap` path labeled "recommended"; `npm install -g` labeled "alternative" — matches plan requirement to present Homebrew as primary

## Deviations from Plan

None — plan executed exactly as written. The only minor deviation was a non-fast-forward push on the notion-cli repo (due to remote commits from a prior planning session) — resolved with `git pull --rebase` before pushing. No plan changes required.

## Verification Results (Task 3)

Commands run and output:

```
$ gh workflow list --repo andrzejchm/homebrew-notion-cli
Update Formula    active    239636589

$ gh run list --repo andrzejchm/homebrew-notion-cli --limit 5
completed    success    Update Formula    Update Formula    main    workflow_dispatch    22501450746    11s    2026-02-27T19:52:07Z

$ grep -n "brew tap\|homebrew\|brew install" README.md
6:[![homebrew tap](...homebrew badge...)](https://github.com/andrzejchm/homebrew-notion-cli)
12:brew tap andrzejchm/notion-cli
13:brew install notion-cli
```

**Status:** ✅ PASS — Workflow active and first run succeeded; README has Homebrew badge and install section.

## Issues Encountered

None.

## User Setup Required

None — tap and workflow are live. The formula will auto-update daily at 08:00 UTC after any `npm publish`.

## Phase Completion

Phase 7 (Homebrew Distribution) is now fully complete:
- Plan 07-01: Tap + formula live, `brew install andrzejchm/notion-cli/notion-cli` works
- Plan 07-02: Auto-update workflow keeps formula current; README documents Homebrew as primary install path

---
*Phase: 07-homebrew-distribution*
*Completed: 2026-02-27*

## Self-Check: PASSED

- ✅ `homebrew-notion-cli/.github/workflows/update-formula.yml` — confirmed created and pushed (commit `caa2a3e`)
- ✅ `README.md` contains `brew tap andrzejchm/notion-cli` (line 12) — confirmed
- ✅ `README.md` contains Homebrew badge (line 6) — confirmed
- ✅ Workflow "Update Formula" active in `gh workflow list` — confirmed
- ✅ First workflow run: completed/success in 11s — confirmed
- ✅ `07-02-SUMMARY.md` written at `.planning/phases/07-homebrew-distribution/` — confirmed
