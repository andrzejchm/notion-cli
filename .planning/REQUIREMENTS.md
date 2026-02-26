# Requirements: notion (Notion CLI)

**Defined:** 2026-02-26
**Core Value:** AI coding agents can read any Notion page or database as structured data (JSON or markdown) without leaving the terminal.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Setup

- [x] **AUTH-01**: User can run `notion init` to set up their Notion integration token with guided prompts
- [x] **AUTH-02**: `notion init` validates the token against Notion API (`GET /users/me`) before saving
- [x] **AUTH-03**: Token and workspace config stored in `~/.config/notion-cli/config.json` (or `$XDG_CONFIG_HOME`)
- [x] **AUTH-04**: Environment variables (`NOTION_API_TOKEN`) override config file values
- [x] **AUTH-05**: User can pass Notion URLs anywhere an ID is expected (URL parsing extracts page/database IDs)

### Search & Discovery

- [ ] **SRCH-01**: User can search workspace by keyword (`notion search <query>`)
- [ ] **SRCH-02**: Search results can be filtered by type (page, database) via `--type` flag
- [ ] **SRCH-03**: User can list all accessible pages and databases (`notion ls`)
- [ ] **SRCH-04**: User can open a page in their browser (`notion open <id/url>`)
- [ ] **SRCH-05**: All list/search commands handle Notion API pagination transparently (auto-paginate by default)

### Page Reading

- [ ] **PAGE-01**: User can read any page as markdown (`notion read <id/url>`)
- [ ] **PAGE-02**: Page reading converts all P1 block types to markdown (paragraph, headings, lists, to_do, code, quote, divider, callout, toggle, image, bookmark, table, child_page, child_database)
- [ ] **PAGE-03**: Page properties (title, status, dates, people, select, multi-select, url, email, checkbox, number, rich_text, relation, formula, rollup, created/edited time) are displayed as a metadata header
- [ ] **PAGE-04**: Rich text annotations (bold, italic, strikethrough, code, underline, color, links, mentions, equations) convert to correct markdown equivalents

### Database Operations

- [ ] **DB-01**: User can view database schema (`notion db schema <id/url>`) showing property names, types, and valid select/status values
- [ ] **DB-02**: User can query a database (`notion db query <id/url>`) to list entries with pagination
- [ ] **DB-03**: Database query supports basic filtering via flags (e.g. `--filter "property=value"`)
- [ ] **DB-04**: Database query supports sorting via `--sort` flag
- [ ] **DB-05**: Database entries display configurable columns (property names as columns in table output)

### Output & Formatting

- [ ] **OUT-01**: When run in a TTY, commands display human-readable formatted tables and markdown
- [ ] **OUT-02**: When piped (no TTY), commands output JSON by default
- [ ] **OUT-03**: `--json` flag forces JSON output regardless of TTY detection
- [ ] **OUT-04**: `--md` flag forces markdown output for page content when piped
- [x] **OUT-05**: Error messages go to stderr with exit code 1

### Agent Integration

- [ ] **AGNT-01**: Repository includes an agent skill file (`.md`) documenting all commands, flags, output formats, and common patterns for AI agents
- [ ] **AGNT-02**: Skill file covers Claude Code, OpenCode, and Codex agent setup instructions

### Social & Meta

- [ ] **META-01**: User can read comments on a page (`notion comments <id/url>`)
- [ ] **META-02**: User can list workspace users (`notion users`)

### Distribution

- [ ] **DIST-01**: CLI installable via `npm install -g @andrzejchm/notion-cli`
- [x] **DIST-02**: CLI binary named `notion`
- [x] **DIST-03**: `notion --help` shows all commands with descriptions
- [x] **DIST-04**: `notion --version` shows current version

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Write Operations

- **WRITE-01**: User can create a new page from markdown content
- **WRITE-02**: User can update page properties
- **WRITE-03**: User can append content blocks to a page
- **WRITE-04**: User can archive/delete a page

### Advanced Features

- **ADV-01**: Recursive page reading (`notion read --deep`) follows child pages
- **ADV-02**: Human-friendly filter syntax (`--where "Status=Done,Priority=High"`)
- **ADV-03**: Output format flags (`--format json|md|yaml`)
- **ADV-04**: Homebrew distribution (`brew install notion-cli`)
- **ADV-05**: Post comments on a page (`notion comment <id> -m "text"`)
- **ADV-06**: Bulk/batch operations with dry-run safety

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP server mode | CLI-only approach — fewer moving parts, agents already know shell commands |
| OAuth / public integration auth | Over-engineering for developer audience — internal tokens sufficient |
| Real-time sync/watch mode | Notion API has no WebSocket/streaming, polling is wasteful at 3 req/sec limit |
| AI/LLM features (summarize, extract) | CLI is data layer, the calling agent IS the AI |
| Obsidian/external sync | Different product — bidirectional sync is notoriously complex |
| Backup/restore | Requires write ops + batch export, defer to v2+ |
| Template management | Notion-native feature, CLI shouldn't reinvent |
| Relationship graph visualization | Niche feature — reading relation properties is sufficient |
| Mobile/GUI interface | Terminal-only tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| SRCH-01 | Phase 2 | Pending |
| SRCH-02 | Phase 2 | Pending |
| SRCH-03 | Phase 2 | Pending |
| SRCH-04 | Phase 2 | Pending |
| SRCH-05 | Phase 2 | Pending |
| PAGE-01 | Phase 3 | Pending |
| PAGE-02 | Phase 3 | Pending |
| PAGE-03 | Phase 3 | Pending |
| PAGE-04 | Phase 3 | Pending |
| DB-01 | Phase 4 | Pending |
| DB-02 | Phase 4 | Pending |
| DB-03 | Phase 4 | Pending |
| DB-04 | Phase 4 | Pending |
| DB-05 | Phase 4 | Pending |
| OUT-01 | Phase 2 | Pending |
| OUT-02 | Phase 2 | Pending |
| OUT-03 | Phase 2 | Pending |
| OUT-04 | Phase 2 | Pending |
| OUT-05 | Phase 1 | Complete |
| AGNT-01 | Phase 5 | Pending |
| AGNT-02 | Phase 5 | Pending |
| META-01 | Phase 2 | Pending |
| META-02 | Phase 2 | Pending |
| DIST-01 | Phase 5 | Pending |
| DIST-02 | Phase 1 | Complete |
| DIST-03 | Phase 1 | Complete |
| DIST-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after 01-01 plan completion (OUT-05, DIST-02, DIST-04 complete)*
