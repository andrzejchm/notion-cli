# Project Research Summary

**Project:** ntn — Notion CLI
**Domain:** CLI tool — Notion workspace reader for AI coding agents and developers
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

`ntn` is a read-only CLI for Notion workspaces that prioritizes AI agent consumption (structured JSON, full-fidelity markdown) with human-friendly terminal output as a secondary mode. The expert approach for this class of tool is a layered architecture — Commander.js commands dispatching to service functions that call the Notion SDK, with a separate rendering layer that detects TTY vs piped output. The stack is well-established: TypeScript on Node 22, @notionhq/client v5.9.0, Commander.js v14, tsup bundling, vitest testing. All libraries are stable, well-documented, and widely adopted. There are no exotic dependencies or unproven technologies.

The hardest technical challenge is **block-to-markdown conversion**. Notion's block model is deeply nested (requiring recursive API calls at 3 req/sec) and spans 25+ block types with combinatorial rich text annotations. This single feature is both the core value proposition and the highest-risk component. Every pitfall identified — rate limiting, recursive fetching, column triple-nesting, synced block loops, unsupported block fallbacks, rich text complexity — converges on this converter. It must be built incrementally with extensive test coverage against real Notion pages.

The competitive landscape is weak: notion-cli-agent (36 stars) is bloated, and the official Notion MCP requires MCP client support and returns raw JSON. `ntn`'s niche — agent-optimized CLI with full-fidelity markdown, dual-mode output, and an agent skill file — is uncontested. The recommended strategy is to ship a focused v1 with search, page reading, database querying, and the agent skill file, then expand to write operations in v2. The one compatibility risk worth tracking is `notion-to-md` v3 against `@notionhq/client` v5 — this needs validation in the first implementation phase.

## Key Findings

### Recommended Stack

The stack is locked. All choices are proven, version-pinned, and compatible. TypeScript 5.7 on Node 22 LTS provides the foundation. The Notion SDK v5.9.0 targets the latest API version (2025-09-03) with built-in retry, pagination helpers, and TypeScript types. Commander.js v14.0.3 handles CLI parsing (avoid v15 pre-release). `notion-to-md` v3.1.9 handles most block-to-markdown conversion (avoid v4 alpha). tsup and vitest are already specified in PROJECT.md.

**Core technologies:**
- **@notionhq/client v5.9.0**: Notion API client — auto-retry on 429/500, pagination helpers, full TS types
- **Commander.js v14.0.3**: CLI framework — subcommands, auto-help, stable (v15 pre-release, avoid)
- **notion-to-md v3.1.9**: Block-to-markdown — battle-tested, supports custom transformers for gaps
- **tsup v8.5.1**: Bundling — zero-config, ESM output with shebang injection for CLI bin
- **chalk v5.6.2 + cli-table3 v0.6.5**: Terminal formatting — colors and tables for TTY mode
- **zod v4.3.6**: Input/config validation — type-safe schema validation
- **conf v13.x**: Config persistence — OS-appropriate paths, atomic writes, schema validation

**Critical version note:** notion-to-md v3 was built against @notionhq/client v2.x types. Compatibility with SDK v5 needs early testing. If types conflict, use adapter layer or `as any` at boundaries.

### Expected Features

**Must have (v1 table stakes):**
- Auth setup (`ntn init`) — guided token setup, validation, config persistence
- Search workspace (`ntn search`) — title-based search, filter by page/database type
- Read page as markdown (`ntn read`) — full-fidelity block-to-markdown, all 25+ block types
- Query database (`ntn db query`) — list entries with filtering and sorting
- Get database schema (`ntn db schema`) — property types, valid values
- Dual-mode output — TTY formatted tables/markdown, piped JSON/markdown
- URL parsing — accept Notion URLs anywhere an ID is expected
- Pagination handling — transparent, all endpoints
- Agent skill file — markdown file teaching AI agents how to use `ntn`

**Should have (v1.x differentiators):**
- Recursive page reading (`--deep`) — follow child pages/databases
- Human-friendly filter syntax (`--where "Status=Done"`)
- `ntn open` — open page in browser
- Comments reading, user listing
- Output format flags (`--format json|md|yaml`)
- List accessible content (`ntn ls`)

**Defer (v2+):**
- Write operations (create/update pages) — markdown-to-blocks is harder than blocks-to-markdown
- Bulk operations — dangerous without dry-run safety
- MCP server mode — CLI approach is simpler, skill file teaches agents
- OAuth — internal token sufficient for target users
- AI/LLM features — the calling agent IS the AI, CLI is data layer

### Architecture Approach

Four-layer architecture: CLI commands → Service layer → Notion API client → Rendering layer, with a Foundation layer (config, auth, output dispatch) underneath everything. Commands parse args and delegate to services. Services fetch data via the API client and return structured objects. The output dispatcher detects TTY vs piped mode and routes to the appropriate renderer (JSON, markdown, or TTY tables). Services never know about output format; commands never call the API directly.

**Major components:**
1. **CLI Entry Layer** — Commander.js subcommands, one file per command, parse args and dispatch
2. **Service Layer** — SearchService, PageService, DatabaseService — pure data orchestration, no CLI concerns
3. **Notion API Client** — Configured @notionhq/client singleton, rate-limit aware, pagination helpers
4. **Block-to-Markdown Converter** — Registry pattern (block type → converter function), recursive tree walker, rich text renderer
5. **Output Dispatcher** — TTY detection, format flag handling, routes to JSON/markdown/table renderers
6. **Config + Auth** — Layered config (`--token` > env var > project `.ntnrc` > global `~/.config/ntn/`), token validation

### Critical Pitfalls

1. **Recursive block fetching hits rate limits** — Notion returns only first-level children. Deep pages need 20-50+ API calls at 3 req/sec. Build concurrency-controlled recursive walker with semaphore (2-3 parallel requests) from day one.
2. **Search is title-only, not full-text** — API searches page/database titles only. Set expectations clearly in help text and documentation. Users will be confused otherwise.
3. **File URLs expire after 1 hour** — Notion-hosted file URLs are signed S3 URLs with expiry. Distinguish `"file"` (expires) from `"external"` (permanent) in all output. Add expiry metadata.
4. **Rich text annotations are combinatorially complex** — Bold + italic + code + link + mention combinations need careful nesting. Build rich text as isolated, heavily-tested module. Define lossy conversion strategy for underline/color.
5. **Column layouts require triple-nested API calls** — `column_list` → `column` blocks → content blocks. Three levels of fetching minimum. The recursive walker handles this IF it follows `has_children` correctly.
6. **Synced blocks can cause infinite loops** — Reference synced blocks point to originals. Track visited block IDs in a set. Handle 404 when original isn't shared with integration.
7. **Pagination is inconsistent across endpoints** — GET vs POST parameter placement differs. Property-level pagination truncates at 25 items. Build generic but parameterized paginator.

## Implications for Roadmap

Based on research, the architecture has clear dependency chains that dictate build order. The block-to-markdown converter is the highest-risk, highest-value component and should be tackled early but built on top of stable foundation and API layers.

### Phase 1: Project Scaffold & Foundation

**Rationale:** Everything depends on config, auth, and a working API client. This phase proves connectivity and establishes project structure. Low complexity, high leverage.
**Delivers:** Working `ntn init`, token storage, validated API connection, project structure (src/cli, src/services, src/api, src/rendering, src/config, src/output), build pipeline (tsup + vitest), URL parsing utility.
**Addresses:** Auth setup, URL parsing, pagination handling infrastructure
**Avoids:** Pitfall 5 (hardcoded auth), Pitfall 6 (pagination inconsistencies) — build robust pagination and config from the start

### Phase 2: Core Services + JSON Output

**Rationale:** Services are the data backbone. Building them with JSON-only output first proves the API integration works without the complexity of markdown rendering. Agents can already use JSON output productively.
**Delivers:** `ntn search`, `ntn db schema`, `ntn db query` with JSON output, `ntn read` returning raw page data as JSON. Output dispatcher with TTY detection.
**Addresses:** Search, database query, database schema, dual-mode output (JSON path), list database entries
**Avoids:** Pitfall 2 (search expectations — document title-only limitation in help text), Pitfall 1 (rate limits — build concurrency control into service layer)

### Phase 3: Block-to-Markdown Converter

**Rationale:** The core value proposition and highest-risk component. Deserves its own phase with dedicated focus. Built on stable services from Phase 2. Uses registry pattern for extensibility.
**Delivers:** Full-fidelity markdown output for `ntn read`. Rich text renderer handling all annotation combinations. Block type registry covering all P1 block types (paragraph, headings, lists, code, quotes, callouts, toggles, tables, images, bookmarks, child pages/databases).
**Addresses:** Read page as markdown (the killer feature), full-fidelity block conversion
**Avoids:** Pitfall 4 (unsupported blocks — explicit fallback), Pitfall 5 (rich text complexity — isolated tested module), Pitfall 7 (column triple-fetch), Pitfall 8 (synced block loops — visited set), Pitfall 3 (file URL expiry — metadata in output)

### Phase 4: TTY Formatting & Polish

**Rationale:** Cosmetic polish that makes the tool pleasant for humans. Agents already work with JSON/markdown from Phase 2-3. This phase adds colored output, table formatting, progress indicators, and error UX.
**Delivers:** Formatted TTY tables for search results and database queries, colored markdown output for pages, progress indicators during large page fetches, helpful error messages (especially 404 = "not shared with integration").
**Addresses:** Dual-mode output (TTY path), human-readable property formatting
**Avoids:** UX pitfalls (no progress indication, raw JSON to terminal, confusing 404s)

### Phase 5: Agent Skill File & Distribution

**Rationale:** The agent skill file documents all commands and patterns — it should be written last when all commands are finalized. Distribution (npm publish) is the final step.
**Delivers:** Agent skill/instruction `.md` file (the agent-native differentiator), npm package (`@andrzejchm/notion-cli`), README, `ntn --help` polish.
**Addresses:** Agent skill file, npm distribution
**Avoids:** Shipping incomplete documentation by writing it after commands are stable

### Phase Ordering Rationale

- **Foundation → Services → Converter → Polish → Ship** follows the dependency graph from ARCHITECTURE.md's build order analysis. Each phase builds on the previous.
- **JSON output before markdown output** is key — it proves services work and lets agents use the tool immediately. Markdown rendering (the hard part) comes after the data pipeline is validated.
- **Block-to-markdown gets its own phase** because it's the highest-complexity component (25+ block types, recursive fetching, rich text annotations). Mixing it with other work risks schedule slip.
- **TTY formatting is cosmetic and separate** because agents (the primary audience) don't use it. It can be deferred or simplified without blocking the core value.
- **Skill file comes last** because it documents all commands — writing it earlier means rewriting it as commands change.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Block-to-Markdown):** Complex domain with edge cases (synced blocks, column layouts, rich text annotation combinations). Needs real Notion test pages for fixture data. The notion-to-md v3 + SDK v5 compatibility question must be resolved here.
- **Phase 5 (Distribution):** npm publishing, shebang injection, global install UX — may need research if the team hasn't published CLI tools to npm before.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard CLI scaffolding with Commander.js, config with `conf`, auth token validation. Well-documented patterns.
- **Phase 2 (Services + JSON):** Straightforward Notion SDK usage with pagination helpers. Official docs are comprehensive.
- **Phase 4 (TTY Polish):** chalk + cli-table3 are well-documented libraries with simple APIs.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All technologies are stable, version-pinned, sourced from official repos. Only risk: notion-to-md v3 compatibility with SDK v5 (needs testing). |
| Features | **HIGH** | Feature set derived from Notion API capabilities, competitive analysis, and PROJECT.md constraints. Clear MVP definition with prioritization. |
| Architecture | **HIGH** | Four-layer pattern is standard for CLI tools. Notion API docs are comprehensive on data models and pagination. Build order follows natural dependencies. |
| Pitfalls | **HIGH** | All pitfalls sourced from official Notion API documentation (rate limits, pagination, block types, search limitations). Real, verified constraints. |

**Overall confidence:** HIGH

### Gaps to Address

- **notion-to-md v3 + @notionhq/client v5 compatibility:** The biggest unknown. v3 was built against SDK v2 types. May work (core block children API is stable) or may need type adapters. **Resolution:** Test in Phase 1 spike. If incompatible, evaluate writing custom block converters from scratch using the registry pattern.
- **Numbered list ordering:** Notion stores `numbered_list_item` blocks independently without sequence numbers. The client must compute numbering by tracking consecutive numbered list items. Needs testing with real data to handle edge cases (lists interrupted by other blocks, nested numbered lists).
- **Token storage security:** Research suggests OS keychain or `~/.config/ntn/` config file. `conf` library handles XDG paths. Whether to use keychain (complex) or plaintext config with restrictive permissions (simple) is an implementation decision for Phase 1.
- **Large workspace performance:** Rate limiting at 3 req/sec is the hard constraint. Concurrent request strategies (semaphore at 2-3) are theoretical — need validation with real workspaces to tune.

## Sources

### Primary (HIGH confidence)
- Notion API Reference — https://developers.notion.com/reference/intro (block types, search, pagination, rate limits, versioning)
- @notionhq/client v5.9.0 — https://github.com/makenotion/notion-sdk-js (SDK capabilities, compatibility, retry logic)
- Commander.js v14.0.3 — https://github.com/tj/commander.js (CLI framework, subcommand patterns)
- notion-to-md v3.1.9 — https://github.com/souvikinator/notion-to-md (block conversion, custom transformers)
- tsup v8.5.1 — https://github.com/egoist/tsup (bundling, shebang injection)
- vitest v3.x — https://github.com/vitest-dev/vitest (testing framework)
- chalk v5.6.2 — https://github.com/chalk/chalk (terminal colors)
- cli-table3 v0.6.5 — https://github.com/cli-table/cli-table3 (TTY tables)
- zod v4.3.6 — https://github.com/colinhacks/zod (validation)

### Secondary (MEDIUM confidence)
- notion-to-md v3 + SDK v5 compatibility — inferred from stable block children API, but untested combination
- Concurrent request tuning (2-3 semaphore) — community best practice, not officially documented by Notion

### Tertiary (LOW confidence)
- notion-to-md v4 timeline — "alpha" status, no stable release date confirmed. Plan for v3, migrate when v4 ships stable.

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
