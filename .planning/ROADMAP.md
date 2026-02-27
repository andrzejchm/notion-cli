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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 4/4 | Complete   | 2026-02-26 |
| 2. Search, Discovery & Output | 4/4 | Complete   | 2026-02-27 |
| 3. Page Reading | 4/4 | Complete | 2026-02-27 |
| 4. Database Operations | 2/2 | Complete | 2026-02-27 |
| 5. Agent Integration & Distribution | 3/3 | Complete | 2026-02-27 |
