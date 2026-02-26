# Feature Research

**Domain:** CLI tool for Notion workspaces (agent-first, human-friendly)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Competitive Landscape

### Existing Notion CLIs

| Tool | Stars | Focus | Key Strength | Key Weakness |
|------|-------|-------|-------------|-------------|
| **notion-cli-agent** (npm) | 36 | AI agent + human, read/write | Comprehensive feature set: CRUD, batch ops, Obsidian sync, validation, templates | Feature bloat — tries to be everything, low adoption (36 stars, v0.5.0) |
| **notion-async** (Rust) | 2 | Sync tool | Rust perf | Sync-only, tiny project |

### Notion MCP (Official)

Notion has an **official MCP server** with 16 tools covering search, fetch, create, update, move, duplicate, comments, users, database queries, and data source management. This is the primary "competition" for agent use cases. Key limitations:
- Requires MCP client support (not all agents have this)
- No markdown output — returns Notion JSON objects
- Rate limited (180 req/min general, 30/min search)
- Enterprise-only for cross-database queries

### ClickUp CLI (`cu` by krodak) — Reference Pattern

Dual-mode output (TTY tables for humans, JSON for piped/agent use). The design inspiration for `ntn`.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Search workspace** | Core discovery mechanism. Users need to find pages/databases by keyword. Notion API has `POST /search` endpoint. | LOW | API is straightforward, but has indexing delay limitations. Filter by type (page/database). |
| **Read page as markdown** | The core value prop. Agents need page content as readable text, not JSON blocks. Every Notion CLI does this. | HIGH | Notion blocks are deeply nested, recursive. ~27 block types to handle: paragraphs, headings, lists, code, callouts, tables, columns, toggles, synced blocks, embeds, equations, etc. This is the hardest single feature. |
| **Read page properties** | Pages have metadata (title, status, dates, assignees). Must be accessible. | MEDIUM | ~20 property types: title, rich_text, number, select, multi_select, date, people, files, checkbox, url, email, phone, formula, relation, rollup, created_time, last_edited_time, status, etc. |
| **Query databases** | Databases are Notion's power feature. Users store tasks, projects, CRM data in them. Querying with filters/sorts is essential. | MEDIUM | Notion API supports rich filtering (equals, contains, before/after dates, etc.) and sorting. Need to expose filter DSL in CLI-friendly way. |
| **List database entries** | Browse what's in a database without complex filters. | LOW | Simple query with optional page_size, possibly with basic property display. |
| **Get database schema** | Understand a database's structure — what properties exist, what types they are, what select values are valid. | LOW | `GET /databases/{id}` returns full schema. Critical for agents to know valid property values before querying. |
| **Auth setup (`ntn init`)** | Users need guided setup for their Notion integration token. | LOW | Store token in config file (~/.config/ntn or similar). Validate token works with `GET /users/me`. |
| **Dual-mode output** | TTY = human-readable tables/markdown; piped = JSON/markdown for agents. The ClickUp CLI pattern. | MEDIUM | Detect `process.stdout.isTTY`. Format accordingly. Need both JSON (structured) and markdown (content) output modes. |
| **Page ID from URL parsing** | Users copy-paste Notion URLs from browser. CLI must extract page/database IDs from URLs. | LOW | Parse `notion.so/<workspace>/<page-title>-<id>` format. Strip dashes from UUID. Essential UX. |
| **Pagination handling** | Notion API paginates at 100 items max. CLI must handle this transparently. | LOW | Auto-paginate by default, or provide `--limit` flag. Use cursor-based pagination from API. |

### Differentiators (Competitive Advantage)

Features that set the product apart from notion-cli-agent and the official MCP.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Agent skill/instruction file** | Ship a `.md` file that teaches AI agents (Claude Code, OpenCode, Codex) how to use `ntn` effectively — common patterns, command examples, output parsing tips. No other Notion CLI does this. This is the agent-native differentiator. | LOW | Just a markdown file, but it's the killer feature for the target audience. Agents read it once and know all the patterns. |
| **Full-fidelity block-to-markdown conversion** | Other CLIs do lossy conversion (skip callouts, flatten columns, ignore synced blocks). `ntn` converts every supported block type to meaningful markdown. Agents get complete page content. | HIGH | The technical moat. Requires handling: toggles as `<details>`, callouts as blockquotes with emoji, columns as sections, tables as markdown tables, code blocks with language, equations as LaTeX, etc. |
| **`ntn open` — open page in browser** | Quick escape hatch: read in terminal, edit in Notion. | LOW | Construct `notion.so` URL from page ID, use `open` (macOS) / `xdg-open` (Linux). |
| **Recursive page reading** | Fetch a page and all its child pages/databases in one command. Agents often need full context of a documentation tree. | MEDIUM | Recursive block children fetch, detect child_page/child_database blocks, follow them. Needs depth limit. |
| **Database query with human-friendly filter syntax** | Instead of JSON filter objects, use `--where "Status=Done,Priority=High"` or `--filter "Due<2026-03-01"`. | MEDIUM | Parse simple expressions into Notion filter objects. Start with equality/contains, expand later. |
| **Output format flexibility** | `--format json`, `--format md`, `--format yaml` for different agent/human needs. Default: markdown for pages, table for databases (TTY) / JSON (piped). | LOW | Serialization layer that wraps all commands. |
| **List accessible content** | `ntn ls` — show all databases and pages the integration can access. Workspace introspection for discovery. | LOW | Use search endpoint with empty query, paginate through results. Group by type. |
| **Comments reading** | Read comments on a page. Useful for agents checking feedback, review notes. | LOW | `GET /comments?block_id={page_id}` — straightforward API. |
| **User listing** | `ntn users` — list workspace users. Useful for resolving "who is assigned to X". | LOW | `GET /users` — paginated list. Show name, email, type. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems, especially for a v1 read-only tool.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Write operations (create/update pages)** | Seems like a natural extension. notion-cli-agent has full CRUD. | Massively increases scope and risk. Markdown-to-blocks conversion is harder than blocks-to-markdown (ambiguous mapping). Writing wrong data to production Notion is dangerous. PROJECT.md explicitly defers to v2. | Ship rock-solid reading first. Let agents use Notion MCP or web UI for writes. v2 can add writes after reading is validated. |
| **MCP server mode** | Notion has an official MCP. Users might want `ntn` as MCP too. | Competes directly with Notion's official MCP server. Different protocol, different concerns. Adds complexity for marginal benefit since agents already know shell commands. PROJECT.md explicitly excludes this. | Ship as CLI. Agents invoke via shell. Skill file teaches patterns. If MCP demand emerges, evaluate later. |
| **OAuth / public integration auth** | Would let non-developers use the tool without creating an integration. | Requires OAuth flow, token refresh, redirect URI handling. Over-engineering for the target user (developers with AI agents). Internal tokens are simpler and sufficient. | Internal integration token only. Document setup in `ntn init`. |
| **Real-time sync/watch mode** | "Watch a database for changes" sounds useful. | Notion API has no WebSocket/streaming. Polling is wasteful and rate-limit-prone (3 req/sec limit). Webhooks exist but require a server. Not a CLI concern. | If users need real-time: use Notion webhooks or Notion MCP. CLI is request/response. |
| **AI/LLM features (summarize, extract, smart queries)** | notion-cli-agent has AI commands. Seems like table stakes for "AI agent" tool. | Requires LLM API keys, adds dependency on external AI services, increases cost and complexity. The CLI should be a data access layer, not an AI layer. Agents calling `ntn` ARE the AI — they don't need AI inside the CLI. | CLI returns raw data. The calling agent does its own summarization/extraction. Clean separation of concerns. |
| **Obsidian/external sync** | notion-cli-agent's marquee feature. | Sync is a different product. Bidirectional sync is notoriously hard, conflict-prone, and bugs cause data loss. Way outside the "read Notion from terminal" scope. | Out of scope. Export to markdown (read) is sufficient. Users wanting sync should use dedicated tools. |
| **Backup/restore** | notion-cli-agent has this. Seems useful for data safety. | Full backup requires paginating ALL pages/databases, fetching ALL blocks recursively. Hits rate limits fast. Restore requires write operations (deferred). Backup is really a batch-export, not a CLI command. | `ntn read` already lets you save a page. Scripting `ntn` in a loop is the backup pattern. Defer formal backup to v2+. |
| **Templates (save/reuse page structures)** | notion-cli-agent has template management. | Templates are a Notion-native feature (database templates). CLI shouldn't reinvent this. Local template storage adds state management complexity. | Use Notion's built-in templates. If v2 adds write operations, support `--template` flag when creating pages. |
| **Bulk operations (bulk update/archive)** | notion-cli-agent's batch command. Power user feature. | Write operations (deferred to v2). Bulk writes are dangerous — one bad filter and you archive 500 pages. Needs safety mechanisms (dry-run, confirmation). | Defer to v2. When writes land, add `--dry-run` by default. |
| **Relationship graph visualization** | notion-cli-agent can show relation graphs in DOT format. | Niche feature. Relations are just properties — reading them is table stakes, graphing them is luxury. Requires Graphviz or similar. | Read relation properties like any other property. Users can pipe JSON to their own visualization tools. |

## Feature Dependencies

```
[Auth Setup (ntn init)]
    └──requires──> ALL features (nothing works without auth)

[Notion API Client wrapper]
    └──requires──> [Auth Setup]
    └──enables──> ALL API-dependent features

[Block-to-Markdown Converter]
    └──requires──> [Notion API Client]
    └──enables──> [Read Page as Markdown]
                   [Recursive Page Reading]

[Read Page as Markdown]
    └──requires──> [Block-to-Markdown Converter]
                   [Page Property Reading]
                   [Pagination Handling]

[Search Workspace]
    └──requires──> [Notion API Client]
    └──enhances──> [List Accessible Content]

[Query Database]
    └──requires──> [Database Schema Reading]
                   [Page Property Reading]
                   [Pagination Handling]

[Dual-Mode Output]
    └──enhances──> ALL display features
    └──independent (layer on top of any command)

[Agent Skill File]
    └──independent (ships alongside CLI, references all commands)

[URL Parsing]
    └──independent (utility, used by all commands accepting IDs)

[Recursive Page Reading]
    └──requires──> [Read Page as Markdown]
    └──requires──> [Pagination Handling]
```

### Dependency Notes

- **Auth Setup is the root dependency:** Every feature needs a valid token. Build this first.
- **Block-to-Markdown is the critical path:** Most complex feature, unlocks the core value prop. Schedule early, expect iteration.
- **Database Schema enables Database Query:** You need to know valid filter values before you can filter.
- **Dual-Mode Output is a cross-cutting concern:** Design the output layer early so all commands use it consistently.
- **Agent Skill File depends on all commands existing:** Write it last (or incrementally), since it documents how to use everything.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate that agents can use `ntn` productively.

- [ ] **Auth setup (`ntn init`)** — guided token setup, validation, config persistence
- [ ] **Search (`ntn search <query>`)** — find pages and databases by keyword, filter by type
- [ ] **Read page (`ntn read <id/url>`)** — full-fidelity markdown output of page content + properties
- [ ] **Query database (`ntn db query <id/url>`)** — list entries with basic filtering
- [ ] **Get database schema (`ntn db schema <id/url>`)** — show properties, types, valid values
- [ ] **Dual-mode output** — TTY tables/markdown vs piped JSON/markdown
- [ ] **URL parsing** — accept Notion URLs anywhere an ID is expected
- [ ] **Agent skill file** — `.md` file with usage patterns for AI agents

### Add After Validation (v1.x)

Features to add once core is working and agents are using it.

- [ ] **Recursive page reading (`ntn read --deep <id>`)** — follow child pages/databases
- [ ] **Human-friendly filter syntax** — `--where "Status=Done"` for database queries
- [ ] **Comments reading (`ntn comments <id>`)** — read page/block comments
- [ ] **User listing (`ntn users`)** — list workspace members
- [ ] **`ntn open <id>`** — open page in browser
- [ ] **Output format flags (`--format json|md|yaml`)** — explicit format control
- [ ] **List accessible content (`ntn ls`)** — workspace content discovery

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Write operations (create/update pages)** — markdown-to-blocks conversion is the hard part
- [ ] **Bulk operations** — batch updates with dry-run safety
- [ ] **Export to file** — save pages/databases as local markdown/JSON files
- [ ] **Homebrew distribution** — after npm distribution is validated

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth setup (`ntn init`) | HIGH | LOW | P1 |
| Search workspace | HIGH | LOW | P1 |
| Read page as markdown | HIGH | HIGH | P1 |
| Query database | HIGH | MEDIUM | P1 |
| Get database schema | HIGH | LOW | P1 |
| Dual-mode output | HIGH | MEDIUM | P1 |
| URL parsing | HIGH | LOW | P1 |
| Agent skill file | HIGH | LOW | P1 |
| Pagination handling | HIGH | LOW | P1 |
| Page property reading | HIGH | MEDIUM | P1 |
| Recursive page reading | MEDIUM | MEDIUM | P2 |
| Human-friendly filters | MEDIUM | MEDIUM | P2 |
| Comments reading | LOW | LOW | P2 |
| User listing | LOW | LOW | P2 |
| Open in browser | MEDIUM | LOW | P2 |
| Output format flags | MEDIUM | LOW | P2 |
| List accessible content | MEDIUM | LOW | P2 |
| Write operations | HIGH | HIGH | P3 |
| Bulk operations | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (v1.0)
- P2: Should have, add in v1.x
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature Area | notion-cli-agent | Notion MCP (Official) | `ntn` (Our Approach) |
|-------------|-----------------|----------------------|---------------------|
| **Search** | Basic search command | `notion-search` (includes Slack/Drive with AI plan) | `ntn search` — focused on Notion workspace, fast, clean output |
| **Read pages** | `page get --content` | `notion-fetch` returns Notion JSON | `ntn read` — **full-fidelity markdown** is the differentiator |
| **Database query** | `db query` with filter flags | `notion-query-database-view` (Business+) | `ntn db query` with human-friendly `--where` syntax |
| **Schema inspection** | `inspect schema` | Included in `notion-fetch` for databases | `ntn db schema` — dedicated command, agent-optimized output |
| **Write operations** | Full CRUD (page create/update/archive) | `notion-create-pages`, `notion-update-page` | **Deferred to v2** — read-only first |
| **AI features** | Smart queries, summarize, extract, suggest | N/A (the MCP client IS the AI) | **None** — CLI is data layer, agent is AI layer |
| **Obsidian sync** | Bidirectional export/import | N/A | **Out of scope** — different product |
| **Batch operations** | `batch` command with JSON payload | Multiple tool calls in one prompt | Script `ntn` commands; formal batch in v2 |
| **Agent support** | `quickstart` command for agents | Native MCP protocol | **Agent skill file** — teaches patterns, no runtime dependency |
| **Output modes** | Basic TTY output | MCP JSON responses | **Dual-mode**: TTY formatted + piped JSON/markdown |
| **Auth** | Env var or `--token` flag | OAuth via MCP server | `ntn init` guided setup + config file |
| **Distribution** | npm global install | Notion-hosted MCP server | npm + Homebrew |

### Competitive Positioning

`ntn` occupies a clear niche:
1. **vs notion-cli-agent**: Focused (read-only v1) vs sprawling (CRUD + AI + sync). Better output quality (full-fidelity markdown) vs more features.
2. **vs Notion MCP**: CLI-based (works everywhere, no MCP client needed) vs protocol-specific. Markdown output vs JSON objects. Explicit skill file vs implicit protocol.
3. **Unique value**: The agent skill file + full-fidelity markdown output + dual-mode CLI is a combination nobody else offers.

## Notion API Coverage Map

What the Notion API supports, mapped to `ntn` feature relevance:

| API Endpoint | Method | v1 Use | v2 Use | Notes |
|-------------|--------|--------|--------|-------|
| Search | POST /search | **YES** — `ntn search` | — | Indexing delay caveat |
| Retrieve page | GET /pages/{id} | **YES** — `ntn read` (properties) | — | Returns properties, not content |
| Retrieve page property | GET /pages/{id}/properties/{id} | **YES** — paginated properties | — | Needed for relation/rollup/people |
| Retrieve block children | GET /blocks/{id}/children | **YES** — `ntn read` (content) | — | Recursive for full page |
| Retrieve block | GET /blocks/{id} | **YES** — individual blocks | — | For targeted block reading |
| Retrieve database | GET /databases/{id} | **YES** — `ntn db schema` | — | Schema, properties, valid values |
| Query database | POST /databases/{id}/query | **YES** — `ntn db query` | — | Filters, sorts, pagination |
| List users | GET /users | v1.x — `ntn users` | — | |
| Retrieve user | GET /users/{id} | v1.x — user details | — | |
| Get self | GET /users/me | **YES** — token validation | — | Used by `ntn init` |
| List comments | GET /comments | v1.x — `ntn comments` | — | |
| Create page | POST /pages | No | **v2** | Write operations |
| Update page | PATCH /pages/{id} | No | **v2** | Write operations |
| Archive page | PATCH /pages/{id} | No | **v2** | Write operations |
| Create database | POST /databases | No | **v2** | Write operations |
| Update database | PATCH /databases/{id} | No | **v2** | Write operations |
| Append block children | PATCH /blocks/{id}/children | No | **v2** | Write operations |
| Update block | PATCH /blocks/{id} | No | **v2** | Write operations |
| Delete block | DELETE /blocks/{id} | No | **v2** | Write operations |
| Create comment | POST /comments | No | **v2** | Write operations |
| File uploads | POST /file-uploads | No | **v2+** | Write operations |

## Block Types to Support (Markdown Conversion)

Completeness of block-to-markdown conversion is the technical differentiator. Priority order:

| Block Type | Markdown Mapping | Priority | Complexity |
|-----------|-----------------|----------|-----------|
| `paragraph` | Plain text | P1 | LOW |
| `heading_1` / `heading_2` / `heading_3` | `#` / `##` / `###` | P1 | LOW |
| `bulleted_list_item` | `- item` (nested = indented) | P1 | LOW |
| `numbered_list_item` | `1. item` (nested = indented) | P1 | LOW |
| `to_do` | `- [ ]` / `- [x]` | P1 | LOW |
| `code` | ` ```language\ncode\n``` ` | P1 | LOW |
| `quote` | `> text` | P1 | LOW |
| `divider` | `---` | P1 | LOW |
| `callout` | `> icon text` (blockquote with emoji prefix) | P1 | LOW |
| `toggle` | `<details><summary>title</summary>content</details>` | P1 | MEDIUM |
| `image` | `![caption](url)` | P1 | LOW |
| `bookmark` | `[title](url)` or URL with caption | P1 | LOW |
| `table` / `table_row` | Markdown table (`| col | col |`) | P1 | MEDIUM |
| `child_page` | `[Page Title](notion-url)` link | P1 | LOW |
| `child_database` | `[Database Title](notion-url)` link | P1 | LOW |
| `column_list` / `column` | Sequential sections (markdown has no columns) | P2 | MEDIUM |
| `synced_block` | Render content (resolve original block) | P2 | MEDIUM |
| `equation` | `$expression$` (inline) or `$$expression$$` (block) | P2 | LOW |
| `embed` | `[Embed](url)` | P2 | LOW |
| `file` | `[Filename](url)` download link | P2 | LOW |
| `video` | `[Video](url)` | P2 | LOW |
| `audio` | `[Audio](url)` | P2 | LOW |
| `pdf` | `[PDF](url)` | P2 | LOW |
| `link_preview` | `[Link](url)` | P2 | LOW |
| `breadcrumb` | Skip (no meaningful markdown equivalent) | P3 | LOW |
| `table_of_contents` | Skip (generate from headings if needed) | P3 | LOW |
| `template` | Skip (template blocks are UI-only) | P3 | LOW |

## Sources

- **Notion API Reference** — https://developers.notion.com/reference/intro (HIGH confidence)
- **Notion Block Types** — https://developers.notion.com/reference/block (HIGH confidence)
- **Notion Search Limitations** — https://developers.notion.com/reference/search-optimizations-and-limitations (HIGH confidence)
- **Notion MCP Supported Tools** — https://developers.notion.com/guides/mcp/mcp-supported-tools (HIGH confidence)
- **Notion SDK for JS** — https://github.com/makenotion/notion-sdk-js v5.9.0 (HIGH confidence)
- **notion-cli-agent** — https://github.com/Balneario-de-Cofrentes/notion-cli-agent v0.5.0 (HIGH confidence)
- **Notion API docs index (llms.txt)** — https://developers.notion.com/llms.txt (HIGH confidence)
- **PROJECT.md** — Local project requirements and constraints (HIGH confidence)

---
*Feature research for: ntn (Notion CLI)*
*Researched: 2026-02-26*
