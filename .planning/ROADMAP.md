# Roadmap: notion (Notion CLI)

## Overview

Build a read-only CLI for Notion workspaces that AI agents and developers use to search, read pages as markdown, and query databases — all from the terminal. The journey starts with a working CLI skeleton and auth, adds search/discovery commands with dual-mode output, tackles the core-value block-to-markdown converter, delivers database operations, and ships with agent skill files and npm distribution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Project scaffold, CLI skeleton, auth setup, config, URL parsing, error handling (completed 2026-02-26)
- [x] **Phase 2: Search, Discovery & Output** - Search workspace, list content, browse users/comments, dual-mode output formatting (completed 2026-02-27)
- [x] **Phase 3: Page Reading** - Full-fidelity block-to-markdown converter with rich text annotations and page properties (completed 2026-02-27)
- [x] **Phase 4: Database Operations** - Database schema, query, filtering, sorting, and tabular display (completed 2026-02-27)
- [x] **Phase 5: Agent Integration & Distribution** - Agent skill files, npm packaging, publish-ready CLI (completed 2026-02-27)
- [x] **Phase 6: Write Operations** - Add comment, append blocks, and create-page commands for AI agent write workflows (completed 2026-02-27)
- [x] **Phase 7: Homebrew Distribution** - Personal tap + formula so users can `brew install notion-cli` (completed 2026-02-27)
- [x] **Phase 8: OAuth Login** - Browser-based OAuth flow so write operations (comments, pages) are attributed to the logged-in user, not the integration bot (completed 2026-02-27)

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: User has a working `notion` CLI binary that authenticates with Notion and provides the infrastructure all commands build on
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, OUT-05, DIST-02, DIST-03, DIST-04
**Success Criteria** (what must be TRUE):
  1. User can run `notion init`, enter their integration token, and have it validated against the Notion API before saving
  2. User can run `notion --help` and `notion --version` and see accurate output
  3. Token is loaded from config file, overridden by `NOTION_API_TOKEN` env var, and persists across sessions
  4. User can pass a Notion URL anywhere an ID is expected and the CLI extracts the correct page/database ID
  5. Errors go to stderr with exit code 1 (no silent failures)
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold, types, error handling, and output utilities
- [ ] 01-02-PLAN.md — Config system (paths, YAML read/write, token resolution)
- [ ] 01-03-PLAN.md — Notion URL/ID parser (TDD)
- [ ] 01-04-PLAN.md — CLI commands (init, profile, completion) and build verification

### Phase 2: Search, Discovery & Output
**Goal**: User can find content in their Notion workspace and see results formatted for their context (human-readable in terminal, JSON when piped)
**Depends on**: Phase 1
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, META-01, META-02, OUT-01, OUT-02, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):
  1. User can search their workspace by keyword and filter results by page or database type
  2. User can list all accessible pages and databases with `ntn ls`
  3. User can read comments on a page and list workspace users
  4. Running in a terminal shows formatted tables; piping output produces JSON by default; `--json` and `--md` flags override format
  5. All list/search commands handle pagination transparently without user intervention
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Output formatter (TTY/JSON/MD modes) + pagination utility
- [x] 02-02-PLAN.md — notion search and notion ls commands
- [x] 02-03-PLAN.md — notion open, notion users, notion comments commands
- [x] 02-04-PLAN.md — CLI wiring (all commands + global --json/--md flags) + human verify

### Phase 3: Page Reading
**Goal**: User can read any Notion page as full-fidelity markdown with all block types and rich text preserved
**Depends on**: Phase 2
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04
**Success Criteria** (what must be TRUE):
  1. User can run `ntn read <id/url>` and get the full page content as markdown
  2. All P1 block types (paragraph, headings, lists, to_do, code, quote, divider, callout, toggle, image, bookmark, table, child_page, child_database) render correctly in markdown
  3. Page properties (title, status, dates, people, select, multi-select, url, email, checkbox, number, rich_text, relation, formula, rollup, timestamps) display as a metadata header
  4. Rich text annotations (bold, italic, strikethrough, code, underline, color, links, mentions, equations) convert to correct markdown equivalents
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — TDD: Rich text annotation converter (bold, italic, code, links, equations)
- [x] 03-02-PLAN.md — Page service (recursive block tree fetcher) + properties formatter
- [x] 03-03-PLAN.md — TDD: Block type converter registry (14 P1 block types)
- [x] 03-04-PLAN.md — Page markdown assembler + notion read command + human verify

### Phase 4: Database Operations
**Goal**: User can inspect database structure and query entries with filtering and sorting
**Depends on**: Phase 2
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05
**Success Criteria** (what must be TRUE):
  1. User can view a database's schema showing property names, types, and valid select/status values
  2. User can query a database and see entries with configurable columns in table or JSON format
  3. User can filter database entries by property values and sort results via flags
  4. Database queries handle pagination transparently for large databases
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Database service (schema fetch, filtered query, filter/sort builders, display formatter)
- [x] 04-02-PLAN.md — notion db schema + notion db query commands + CLI wiring + human verify

### Phase 5: Agent Integration & Distribution
**Goal**: AI coding agents can install `notion` via npm and learn all commands from a bundled skill file
**Depends on**: Phase 3, Phase 4
**Requirements**: AGNT-01, AGNT-02, DIST-01
**Success Criteria** (what must be TRUE):
  1. User can run `npm install -g @andrzejchm/notion-cli` and get a working `notion` binary
  2. Repository includes an agent skill file documenting all commands, flags, output formats, and common patterns
  3. Skill file covers setup instructions for Claude Code, OpenCode, and Codex agents
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Agent skill file (docs/agent-skill.md) covering all commands + Claude Code/OpenCode/Codex setup
- [x] 05-02-PLAN.md — npm packaging (package.json metadata, README.md, .npmignore, pack dry-run)
- [x] 05-03-PLAN.md — Local install verification + npm publish (human checkpoint)

### Phase 6: Write Operations
**Goal**: AI agents can post comments, append markdown content, and create new pages via CLI commands
**Depends on**: Phase 5
**Requirements**: WRITE-01, WRITE-03, ADV-05
**Success Criteria** (what must be TRUE):
  1. User can run `notion comment <id> -m "text"` and a comment appears on the Notion page
  2. User can run `notion append <id> -m "markdown"` and blocks appear at the bottom of the page
  3. User can run `notion create-page --parent <id> --title "Title"` and a new page is created, returning its URL
  4. All three commands handle stdin as an alternative content source
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — TDD: markdown-to-blocks converter (mdToBlocks)
- [x] 06-02-PLAN.md — `notion comment` + `notion append` commands + CLI wiring
- [x] 06-03-PLAN.md — `notion create-page` command + human verify

### Phase 7: Homebrew Distribution
**Goal**: Users can install the `notion` CLI with a single `brew install andrzejchm/notion-cli/notion-cli` command
**Depends on**: Phase 5 (npm package published)
**Requirements**: ADV-04
**Success Criteria** (what must be TRUE):
  1. User can run `brew tap andrzejchm/notion-cli && brew install notion-cli` and get a working `notion` binary
  2. Formula installs from the published npm tarball on registry.npmjs.org (no npm required from user)
  3. README documents Homebrew as the primary installation method
  4. A GitHub Actions workflow in the tap repo auto-updates the formula sha256 + version on each new npm release
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Create `homebrew-notion-cli` tap repo with Homebrew formula
- [x] 07-02-PLAN.md — GitHub Actions auto-update workflow + README brew instructions

### Phase 8: OAuth Login
**Goal**: User can run `notion auth login` to authenticate via Notion OAuth so that write operations (comments, pages) are attributed to their actual user account, not the integration bot
**Depends on**: Phase 6 (Write Operations)
**Requirements**: OAUTH-01, OAUTH-02, OAUTH-03, OAUTH-04, OAUTH-05, OAUTH-06, OAUTH-07, OAUTH-08
**Success Criteria** (what must be TRUE):
  1. User can run `notion auth login` and complete browser OAuth flow — token stored in profile
  2. After OAuth login, `notion comment <id> -m "text"` posts comment attributed to the user (not the integration bot)
  3. Access tokens auto-refresh using the stored refresh_token (transparent to the user)
  4. `notion auth status` shows which auth method is active (OAuth vs internal integration token)
  5. `notion auth logout` removes the OAuth session, falling back to internal integration token
  6. Headless flow: `notion auth login --manual` prints auth URL for copy-paste without a local browser
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md — Type extensions, OAuth client module (bundled creds), token-store, resolveToken() with auto-refresh
- [x] 08-02-PLAN.md — OAuth loopback flow + auth login/logout/status commands + CLI wiring
- [x] 08-03-PLAN.md — Docs update (README, agent-skill) + init hint + human verify

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 4/4 | Complete   | 2026-02-26 |
| 2. Search, Discovery & Output | 4/4 | Complete   | 2026-02-27 |
| 3. Page Reading | 4/4 | Complete | 2026-02-27 |
| 4. Database Operations | 2/2 | Complete | 2026-02-27 |
| 5. Agent Integration & Distribution | 3/3 | Complete | 2026-02-27 |
| 6. Write Operations | 3/3 | Complete   | 2026-02-27 |
| 7. Homebrew Distribution | 2/2 | Complete | 2026-02-27 |
| 8. OAuth Login | 3/3 | Complete   | 2026-02-27 |
