# Requirements: ntn (Notion CLI)

**Defined:** 2026-02-26
**Core Value:** AI coding agents can read any Notion page or database as structured data (JSON or markdown) without leaving the terminal.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Setup

- [ ] **AUTH-01**: User can run `ntn init` to set up their Notion integration token with guided prompts
- [ ] **AUTH-02**: `ntn init` validates the token against Notion API (`GET /users/me`) before saving
- [ ] **AUTH-03**: Token and workspace config stored in `~/.config/ntn/config.json` (or `$XDG_CONFIG_HOME`)
- [ ] **AUTH-04**: Environment variables (`NTN_API_TOKEN`) override config file values
- [ ] **AUTH-05**: User can pass Notion URLs anywhere an ID is expected (URL parsing extracts page/database IDs)

### Search & Discovery

- [ ] **SRCH-01**: User can search workspace by keyword (`ntn search <query>`)
- [ ] **SRCH-02**: Search results can be filtered by type (page, database) via `--type` flag
- [ ] **SRCH-03**: User can list all accessible pages and databases (`ntn ls`)
- [ ] **SRCH-04**: User can open a page in their browser (`ntn open <id/url>`)
- [ ] **SRCH-05**: All list/search commands handle Notion API pagination transparently (auto-paginate by default)

### Page Reading

- [ ] **PAGE-01**: User can read any page as markdown (`ntn read <id/url>`)
- [ ] **PAGE-02**: Page reading converts all P1 block types to markdown (paragraph, headings, lists, to_do, code, quote, divider, callout, toggle, image, bookmark, table, child_page, child_database)
- [ ] **PAGE-03**: Page properties (title, status, dates, people, select, multi-select, url, email, checkbox, number, rich_text, relation, formula, rollup, created/edited time) are displayed as a metadata header
- [ ] **PAGE-04**: Rich text annotations (bold, italic, strikethrough, code, underline, color, links, mentions, equations) convert to correct markdown equivalents

### Database Operations

- [ ] **DB-01**: User can view database schema (`ntn db schema <id/url>`) showing property names, types, and valid select/status values
- [ ] **DB-02**: User can query a database (`ntn db query <id/url>`) to list entries with pagination
- [ ] **DB-03**: Database query supports basic filtering via flags (e.g. `--filter "property=value"`)
- [ ] **DB-04**: Database query supports sorting via `--sort` flag
- [ ] **DB-05**: Database entries display configurable columns (property names as columns in table output)

### Output & Formatting

- [ ] **OUT-01**: When run in a TTY, commands display human-readable formatted tables and markdown
- [ ] **OUT-02**: When piped (no TTY), commands output JSON by default
- [ ] **OUT-03**: `--json` flag forces JSON output regardless of TTY detection
- [ ] **OUT-04**: `--md` flag forces markdown output for page content when piped
- [ ] **OUT-05**: Error messages go to stderr with exit code 1

### Agent Integration

- [ ] **AGNT-01**: Repository includes an agent skill file (`.md`) documenting all commands, flags, output formats, and common patterns for AI agents
- [ ] **AGNT-02**: Skill file covers Claude Code, OpenCode, and Codex agent setup instructions

### Social & Meta

- [ ] **META-01**: User can read comments on a page (`ntn comments <id/url>`)
- [ ] **META-02**: User can list workspace users (`ntn users`)

### Distribution

- [ ] **DIST-01**: CLI installable via `npm install -g @andrzejchm/notion-cli`
- [ ] **DIST-02**: CLI binary named `ntn`
- [ ] **DIST-03**: `ntn --help` shows all commands with descriptions
- [ ] **DIST-04**: `ntn --version` shows current version

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Write Operations

- **WRITE-01**: User can create a new page from markdown content
- **WRITE-02**: User can update page properties
- **WRITE-03**: User can append content blocks to a page
- **WRITE-04**: User can archive/delete a page

### Advanced Features

- **ADV-01**: Recursive page reading (`ntn read --deep`) follows child pages
- **ADV-02**: Human-friendly filter syntax (`--where "Status=Done,Priority=High"`)
- **ADV-03**: Output format flags (`--format json|md|yaml`)
- **ADV-04**: Homebrew distribution (`brew install notion-cli`)
- **ADV-05**: Post comments on a page (`ntn comment <id> -m "text"`)
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
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| SRCH-01 | — | Pending |
| SRCH-02 | — | Pending |
| SRCH-03 | — | Pending |
| SRCH-04 | — | Pending |
| SRCH-05 | — | Pending |
| PAGE-01 | — | Pending |
| PAGE-02 | — | Pending |
| PAGE-03 | — | Pending |
| PAGE-04 | — | Pending |
| DB-01 | — | Pending |
| DB-02 | — | Pending |
| DB-03 | — | Pending |
| DB-04 | — | Pending |
| DB-05 | — | Pending |
| OUT-01 | — | Pending |
| OUT-02 | — | Pending |
| OUT-03 | — | Pending |
| OUT-04 | — | Pending |
| OUT-05 | — | Pending |
| AGNT-01 | — | Pending |
| AGNT-02 | — | Pending |
| META-01 | — | Pending |
| META-02 | — | Pending |
| DIST-01 | — | Pending |
| DIST-02 | — | Pending |
| DIST-03 | — | Pending |
| DIST-04 | — | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 0
- Unmapped: 32

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after initial definition*
