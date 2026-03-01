---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-27T22:12:46Z"
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 25
  completed_plans: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** AI coding agents can read any Notion page or database as structured data (JSON or markdown) without leaving the terminal
**Current focus:** Phase 3: Page Reading (or Phase 4: Database Operations — can run in parallel)

## Current Position

Phase: 8 of 8 (COMPLETE)
Plan: 3 of 3 in Phase 8 complete
Status: Phase 8 complete — OAuth docs, init hint, E2E verification, user attribution fix
Last activity: 2026-02-27 — 08-03 executed: README/SKILL.md OAuth docs, init hint, display_name fix, human verified

Progress: [█████████████████████████] 100% (25/25 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 10.7 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 4 | 47 min | 11.8 min |

**Recent Trend:**
- Last 5 plans: 12 min, 5 min, 15 min, 15 min
- Trend: Steady

*Updated after each plan completion*
| Phase 08-oauth-login P01 | 8 min | 2 tasks | 4 files |
| Phase 02-search-discovery-output P03 | 2 | 2 tasks | 3 files |
| Phase 02-search-discovery-output P04 | ~15 min | 2 tasks | 1 file |
| Phase 05-agent-distribution P01 | 2 | 1 tasks | 1 files |
| Phase 05-agent-distribution P02 | 8 | 2 tasks | 3 files |
| Phase 06-write-operations P01 | 2 min | 2 tasks | 2 files |
| Phase 06-write-operations P02 | 1 min | 2 tasks | 4 files |
| Phase 06-write-operations P03 | 1 min | 2 tasks | 3 files |
| Phase 08-oauth-login P02 | 9 | 2 tasks | 5 files |
| Phase 08-oauth-login P03 | ~15 min | 2 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- Phase 9 added: unify auth flow for the notion cli, should be a single command to start it, make explicit what are the downsides of each form

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 5 phases derived from 32 requirements — Foundation → Search → Pages → Databases → Ship
- [Roadmap]: Phase 3 (Page Reading) and Phase 4 (Database Operations) can execute in parallel — both depend on Phase 2 but not each other
- [Research]: notion-to-md v3 + SDK v5 compatibility is the biggest unknown — test early in Phase 3
- [01-01]: ESM-only project (type:module) required for chalk v5, @notionhq/client v5, @inquirer/prompts compatibility
- [01-01]: withErrorHandling lazy-imports @notionhq/client to keep notion --help startup fast
- [01-01]: CliError format: [CODE] message\n  → suggestion (Pattern 3 from research)
- [Phase 01-02]: readGlobalConfig returns {} on ENOENT (not null) — simplifies all callers with optional chaining
- [Phase 01-02]: Atomic write pattern: mkdir(0700) + writeFile(tmp, 0600) + rename — POSIX atomicity for config files
- [Phase 01-02]: resolveToken() is the standard auth method: env > .notion.yaml > active_profile with TokenResult source
- [Phase 01-03]: Use lazy URL regex (.*?) for path prefix to handle bare ID path segments without page title
- [Phase 01-03]: Extract throwInvalidId() never-returning helper to DRY up duplicate CliError construction
- [Phase 01-04]: Notion integrations URL is /profile/integrations/internal (not /my-integrations)
- [Phase 01-04]: withErrorHandling generalized to typed args — supports commands with positional arguments
- [Phase 01-04]: Shell completion scripts are static — simple, predictable, grow as commands are added
- [Phase 02-01]: OutputMode 'auto' checks TTY at render time — single printOutput() entry point, no mode-checking in command files
- [Phase 02-01]: Column widths capped by header name: TYPE=8, TITLE=50, ID=32 — prevents long titles from wrecking table layout
- [Phase 02-01]: paginateResults uses while+hasMore flag (not do-while) for TypeScript strict scoping compatibility
- [Phase 02-02]: Notion SDK v5 search returns DataSourceObjectResponse (object: 'data_source') not DatabaseObjectResponse — use isFullPageOrDataSource()
- [Phase 02-02]: User-facing 'database' type maps to SDK 'data_source' filter value — displayType() remaps back for human output
- [Phase 02-03]: UserObjectResponse is discriminated union (type=person|bot) — access person/bot fields via type narrowing
- [Phase 02-03]: comments.list() requires block_id in UUID format — parseNotionId returns 32-hex, toUuid() converts before API call
- [Phase 02-03]: open command prints URL to stdout so piped usage is scriptable (no --json flag needed)
- [Phase 02-04]: Global --json/--md flags live on root program, not per-command — single preAction hook propagates output mode to all subcommands
- [Phase 02-04]: preAction hook checks json first, then md — json takes precedence if both flags are provided
- [Phase 04-01]: SDK v5 databases are dataSources — use client.dataSources.retrieve/query with data_source_id (not databases.query)
- [Phase 04-01]: DataSourceObjectResponse has .properties but DatabaseObjectResponse does not — always use dataSources.retrieve for schema
- [Phase 04-01]: buildFilter inspects schema property type before constructing Notion API filter — schema required for correct filter shape
- [Phase 04-02]: Auto-select columns that fit terminal width — skip relation/rich_text/people by default for clean table output
- [Phase 04-02]: Cap all column values to 40 chars and strip newlines to prevent table layout corruption
- [Phase 04-02]: Commander collect() helper pattern for repeatable flags (--filter, --sort)
- [Phase 05-agent-distribution]: Agent skill file is 475 lines (above target) — chose completeness; all content substantive
- [Phase 05-agent-distribution]: docs/ directory created as top-level folder for project documentation
- [Phase 05-agent-distribution]: package.json files array allowlists dist/, docs/agent-skill.md, README.md for tarball
- [Phase 05-agent-distribution]: engines.node >=22.0.0 matches tsup build target node22
- [Phase 05-agent-distribution]: .npmignore excludes src/, tests/, .planning/, .opencode/, tsconfig files from npm tarball
- [Phase 05-03]: npm pkg fix normalized bin field from ./dist/cli.js to dist/cli.js — required for clean npm publish
- [06-01]: parseInlineMarkdown uses single-pass regex for all annotation types — no nesting, good enough for AI agent output patterns
- [06-01]: Code fence language passed through as-is with type cast — SDK LanguageRequest is strict enum but arbitrary tags like 'ts' should round-trip
- [06-01]: BlockObjectRequest type assertions required in SDK v5 — discriminated union narrows on content key (paragraph:) not type: field
- [06-02]: write.service.ts provides thin wrappers — no business logic; callers own ID conversion (toUuid)
- [06-02]: appendCommand guards blocks.length === 0 — prints 'Nothing to append.' rather than empty API call
- [06-02]: requiredOption() used for -m/--message — Commander handles missing-flag error with usage message
- [06-02]: comment (singular) is the write command; comments (plural) is the read command — matches natural English
- [06-03]: createPage() casts response as { url: string } — PageObjectResponse has url at runtime but SDK v5 union type requires assertion
- [06-03]: stdin read deferred until after -m check — prevents hanging if -m flag not provided in interactive session
- [06-03]: requiredOption() for both --parent and --title — Commander handles missing-flag error automatically
- [07-01]: std_npm_args pattern for npm-tarball Homebrew formula: installs into libexec, symlinks bin/ entries — no npm required from user
- [07-01]: brew link --overwrite needed when notion already installed via npm global — expected coexistence scenario
- [07-02]: Workflow uses grep -oP (Perl regex) to extract current version from formula URL — works on ubuntu-latest
- [07-02]: up_to_date=true guard skips commit on daily runs when already current — avoids empty commits
- [07-02]: Homebrew badge placed after npm version badge; brew tap labeled "recommended", npm as "alternative"
- [08-01]: ProfileConfig.token made optional — OAuth profiles don't have an internal integration token
- [08-01]: OAuth credentials XOR-encoded + split per RFC 8252 (client secrets not truly secret in native apps; redirect URI lock is the real boundary)
- [08-01]: Conservative 1-hour expiry for OAuth tokens — Notion omits expires_in for public integrations
- [08-01]: resolveToken() returns source:'oauth' to distinguish OAuth-attributed operations from internal integration operations
- [08-01]: clearOAuthTokens() called on refresh failure to avoid stale token state before re-auth
- [Phase 08-02]: TTY check in login: non-TTY without --manual throws AUTH_NO_TOKEN (prevents hanging in piped/CI environments)
- [Phase 08-02]: Browser open failure auto-falls-back to manual flow — no crash on headless systems
- [Phase 08-02]: notion auth logout preserves internal integration token — only clears OAuth fields
- [08-03]: display_name:{type:'user'} required in comments.create() for Notion API to attribute comment to OAuth user — without it, comment is bot-attributed even with valid OAuth token
- [08-03]: Auth priority documented in README and SKILL.md — OAuth takes precedence over internal integration token when both configured

### Pending Todos

None — all 25 plans complete. Project milestone v1.0 delivered.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 08-03-PLAN.md — OAuth docs update, init hint, E2E human verification, user attribution fix
Resume: All plans complete — project milestone v1.0 delivered
