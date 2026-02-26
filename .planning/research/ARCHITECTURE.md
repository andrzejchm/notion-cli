# Architecture Research

**Domain:** CLI tool for Notion API (read-only, dual-mode output for agents and humans)
**Researched:** 2026-02-26
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLI Entry Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ search   │  │ page     │  │ database │  │ init     │            │
│  │ command  │  │ command  │  │ command  │  │ command  │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │              │             │              │                  │
├───────┴──────────────┴─────────────┴──────────────┴──────────────────┤
│                     Service Layer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ SearchService│  │ PageService  │  │ DatabaseSvc  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                       │
├─────────┴─────────────────┴──────────────────┴───────────────────────┤
│                     Notion API Client                                │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  @notionhq/client wrapper (pagination, error handling)    │      │
│  └───────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│                     Rendering Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ BlockToMD    │  │ PropertyFmt  │  │ TableFmt     │               │
│  │ (converter)  │  │ (DB props)   │  │ (TTY tables) │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
├──────────────────────────────────────────────────────────────────────┤
│                     Foundation                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Config       │  │ Auth         │  │ Output       │               │
│  │ Manager      │  │ Manager      │  │ Dispatcher   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CLI Entry (commands)** | Parse args/flags, validate input, dispatch to services, select output format | Commander.js program with subcommands. Each command is a separate file registering on the program. |
| **Service Layer** | Orchestrate API calls, handle pagination aggregation, assemble domain objects from raw API responses | Pure TypeScript classes/functions. Each service wraps one Notion domain (pages, databases, search). No CLI concerns leak here. |
| **Notion API Client** | Thin wrapper around `@notionhq/client`. Configures auth, handles rate limiting, provides typed pagination helpers | Single module that initializes and exports a configured `Client` instance. Leverages SDK's built-in retry (429/500/503). |
| **Block-to-Markdown Converter** | Recursively traverse Notion block tree, convert each block type to markdown string | Recursive function handling 25+ block types. Must handle `has_children` for nested fetching. This is the highest-complexity component. |
| **Property Formatter** | Convert Notion database property values (select, date, relation, formula, etc.) to display strings | Map of property type → formatter function. Used by both JSON and table output paths. |
| **Table Formatter** | Render structured data as aligned TTY tables for human consumption | Uses a library like `cli-table3` or hand-rolled column alignment. Only active when `stdout.isTTY` is true. |
| **Config Manager** | Read/write `.ntnrc` or similar config file. Store workspace token, default output preferences | Reads from `~/.ntnrc` (global) with project-level `.ntnrc` override. JSON or TOML format. |
| **Auth Manager** | Validate and store the Notion integration token. Test connectivity on `ntn init` | Stores token in config file. Validates by calling `notion.users.me()` on init. |
| **Output Dispatcher** | Detect TTY vs piped mode, route to appropriate formatter (JSON, markdown, table) | Checks `process.stdout.isTTY`. Piped = JSON/markdown (flag-selected). TTY = formatted tables or rendered markdown. |

## Recommended Project Structure

```
src/
├── cli/                    # Command definitions
│   ├── index.ts            # Program setup, global options
│   ├── search.ts           # ntn search <query>
│   ├── page.ts             # ntn page <id> [--json|--md]
│   ├── db.ts               # ntn db <id> [--filter] [--json]
│   └── init.ts             # ntn init (auth setup)
├── services/               # Business logic, API orchestration
│   ├── search.service.ts   # Search across workspace
│   ├── page.service.ts     # Fetch page + all blocks recursively
│   └── db.service.ts       # Query databases, resolve properties
├── api/                    # Notion API client configuration
│   └── client.ts           # Configured @notionhq/client instance
├── rendering/              # Output formatting
│   ├── blocks-to-md.ts     # Block tree → markdown string
│   ├── rich-text.ts        # Rich text array → string (with annotations)
│   ├── property.ts         # Property value → display string
│   └── table.ts            # Structured data → TTY table
├── config/                 # Configuration management
│   ├── config.ts           # Read/write/merge config
│   └── auth.ts             # Token storage and validation
├── output/                 # Output mode detection and dispatch
│   └── dispatcher.ts       # TTY detection, format selection
├── types/                  # Shared type definitions
│   └── index.ts            # App-level types (not Notion SDK types)
└── index.ts                # Entry point (#!/usr/bin/env node)
```

### Structure Rationale

- **`cli/`:** Isolated from business logic. Each file registers one command. Easy to add new commands without touching services. Commander.js subcommands map 1:1 to files.
- **`services/`:** Pure data-fetching and orchestration. No knowledge of CLI flags or output format. Testable in isolation with mocked API client.
- **`api/`:** Single point of client configuration. If Notion changes SDK versions (they just released v5 for API 2025-09-03), changes are localized here.
- **`rendering/`:** The most complex layer. Block-to-markdown conversion is a standalone module that can be tested against fixture data. Property formatting is separate because it serves both table and JSON output.
- **`config/`:** Separate from auth because config also stores preferences (default output format, page size). Auth is a specialized config concern.
- **`output/`:** The "glue" — decides which renderer to use based on environment and flags.

## Architectural Patterns

### Pattern 1: Command → Service → Renderer Pipeline

**What:** Each CLI command follows a strict three-phase pipeline: parse → fetch → render. Commands never call the Notion API directly. Services never format output.

**When to use:** Every command.

**Trade-offs:** Slightly more files, but dramatically better testability and maintainability. Services can be reused if the tool grows (e.g., adding an MCP server mode later would reuse services).

**Example:**
```typescript
// cli/page.ts
import { createCommand } from 'commander';
import { fetchPageWithBlocks } from '../services/page.service';
import { renderPage } from '../output/dispatcher';

export const pageCommand = createCommand('page')
  .argument('<page-id>', 'Notion page ID or URL')
  .option('--json', 'Output raw JSON')
  .option('--md', 'Output as markdown (default for piped)')
  .action(async (pageId, options) => {
    const page = await fetchPageWithBlocks(pageId);
    renderPage(page, options);
  });
```

### Pattern 2: Recursive Block Fetching with Depth Control

**What:** Notion blocks form a tree. The API only returns first-level children per call. To get a full page, you must recursively fetch children for any block where `has_children === true`. This requires multiple API calls per page.

**When to use:** Any time page content is rendered (page read, search result preview).

**Trade-offs:** A deeply nested page can require many API calls (each returning max 100 blocks). Rate limit is 3 req/sec average. A page with 10 nested levels and 50 blocks-with-children needs 50+ API calls. Must handle this with concurrent requests capped to respect rate limits.

**Example:**
```typescript
// services/page.service.ts
import { collectPaginatedAPI } from '@notionhq/client';

async function fetchBlockTree(
  blockId: string,
  depth: number = 0,
  maxDepth: number = 10
): Promise<BlockNode[]> {
  if (depth >= maxDepth) return [];
  
  const blocks = await collectPaginatedAPI(
    notion.blocks.children.list,
    { block_id: blockId }
  );
  
  const tree: BlockNode[] = [];
  for (const block of blocks) {
    const children = block.has_children
      ? await fetchBlockTree(block.id, depth + 1, maxDepth)
      : [];
    tree.push({ ...block, children });
  }
  return tree;
}
```

### Pattern 3: Output Mode Dispatch (Dual-Mode Output)

**What:** Detect whether stdout is a TTY (human at terminal) or piped (agent consuming output). TTY gets formatted tables and colored markdown. Piped gets raw JSON or clean markdown. The user can override with `--json` or `--md` flags.

**When to use:** Every command's output path.

**Trade-offs:** Two rendering paths to maintain. But this is the core value proposition — agents get structured data, humans get readable output.

**Example:**
```typescript
// output/dispatcher.ts
export function dispatch<T>(data: T, options: OutputOptions): void {
  const format = resolveFormat(options);
  
  switch (format) {
    case 'json':
      process.stdout.write(JSON.stringify(data, null, 2) + '\n');
      break;
    case 'markdown':
      process.stdout.write(renderMarkdown(data) + '\n');
      break;
    case 'table':
      process.stdout.write(renderTable(data) + '\n');
      break;
  }
}

function resolveFormat(options: OutputOptions): 'json' | 'markdown' | 'table' {
  if (options.json) return 'json';
  if (options.md) return 'markdown';
  if (process.stdout.isTTY) return 'table'; // or 'markdown' for page content
  return 'json'; // default for piped output (agent-friendly)
}
```

### Pattern 4: Block-Type Registry (Extensible Converter)

**What:** Map each Notion block type to a dedicated converter function. New block types are added by registering a new entry, not by modifying a giant switch statement.

**When to use:** Block-to-markdown conversion.

**Trade-offs:** Slight indirection, but block types number 25+ and will grow. Registry pattern keeps each converter focused and testable.

**Example:**
```typescript
// rendering/blocks-to-md.ts
type BlockConverter = (block: BlockObjectResponse, children: string) => string;

const converters: Record<string, BlockConverter> = {
  paragraph: (block, children) => {
    const text = richTextToMd(block.paragraph.rich_text);
    return text + (children ? '\n' + children : '') + '\n';
  },
  heading_1: (block) => `# ${richTextToMd(block.heading_1.rich_text)}\n`,
  heading_2: (block) => `## ${richTextToMd(block.heading_2.rich_text)}\n`,
  heading_3: (block) => `### ${richTextToMd(block.heading_3.rich_text)}\n`,
  bulleted_list_item: (block, children) => {
    const text = richTextToMd(block.bulleted_list_item.rich_text);
    return `- ${text}\n${indent(children, '  ')}`;
  },
  code: (block) => {
    const text = richTextToMd(block.code.rich_text);
    const lang = block.code.language;
    return `\`\`\`${lang}\n${text}\n\`\`\`\n`;
  },
  // ... 20+ more block types
};

export function blockToMd(block: BlockObjectResponse, children: string): string {
  const converter = converters[block.type];
  if (!converter) return `<!-- unsupported block type: ${block.type} -->\n`;
  return converter(block, children);
}
```

## Data Flow

### Core Read Flow: Page → Markdown

```
User runs: ntn page <id>
    │
    ▼
[CLI Layer] parse args, resolve page ID from URL/UUID
    │
    ▼
[PageService] notion.pages.retrieve({ page_id })
    │            → get page metadata (title, icon, properties)
    │
    ▼
[PageService] fetchBlockTree(page_id)
    │            → notion.blocks.children.list (paginated)
    │            → for each block with has_children: recurse
    │            → returns BlockNode[] tree
    │
    ▼
[Output Dispatcher] detect TTY vs piped, check --json/--md flags
    │
    ├── JSON path:  serialize page metadata + raw block tree
    │
    └── Markdown path:
         │
         ▼
    [Block-to-MD Converter]
         │  Walk block tree depth-first
         │  For each block: converter registry lookup → markdown fragment
         │  Rich text → apply bold/italic/code/link annotations
         │  Assemble fragments with proper nesting/indentation
         │
         ▼
    [stdout] final markdown string
```

### Search Flow

```
User runs: ntn search "query"
    │
    ▼
[CLI Layer] parse args, validate query
    │
    ▼
[SearchService] notion.search({ query, filter, sort })
    │              → paginate if needed (default 100 results per page)
    │              → returns pages + databases matching query
    │
    ▼
[Output Dispatcher]
    │
    ├── JSON path:  serialize search results array
    │
    └── TTY path:
         │
         ▼
    [Table Formatter] 
         │  For each result: extract title, type, last_edited, URL
         │  Render as aligned columns
         │
         ▼
    [stdout] formatted table
```

### Database Query Flow

```
User runs: ntn db <id> [--filter prop=value] [--sort prop:asc]
    │
    ▼
[CLI Layer] parse args, build filter/sort objects from flags
    │
    ▼
[DatabaseService] 
    │  1. notion.databases.retrieve({ database_id })
    │     → get schema (property names, types)
    │  2. notion.databases.query({ database_id, filter, sorts })
    │     → paginate, collect all results
    │
    ▼
[Output Dispatcher]
    │
    ├── JSON path:  serialize query results with properties
    │
    └── TTY path:
         │
         ▼
    [Property Formatter + Table Formatter]
         │  Map each page's properties through type-specific formatters
         │  (select → name, date → formatted string, relation → titles, etc.)
         │  Render as table with property names as column headers
         │
         ▼
    [stdout] formatted table
```

### Auth Flow

```
User runs: ntn init
    │
    ▼
[CLI Layer] prompt for token (or accept --token flag)
    │
    ▼
[Auth Manager]
    │  1. Validate token format (starts with ntn_ or secret_)
    │  2. Test: notion.users.me() — verifies connectivity
    │  3. Store token in ~/.ntnrc (or project .ntnrc)
    │
    ▼
[stdout] "Connected to workspace: [name]"
```

### Key Data Flows

1. **Block tree fetching:** Most complex flow. Notion's API returns only first-level children. Full page content requires recursive descent with pagination at each level. A page with 200 blocks across 5 nesting levels may need 20-30 API calls. The SDK's `collectPaginatedAPI` helper handles pagination per level; our code handles the recursion.

2. **Rich text rendering:** Appears in almost every block type. Rich text arrays contain segments with annotations (bold, italic, code, strikethrough, underline, color) and links. Markdown rendering must merge adjacent segments, handle nested formatting, and convert Notion's mention types (page, database, user, date) to meaningful text.

3. **Property value rendering:** Database pages have typed properties (number, select, multi_select, date, person, relation, formula, rollup, etc.). Each type has a distinct JSON structure. The property formatter must handle all ~20 property types. For TTY output, values are truncated to fit columns. For JSON output, raw values pass through.

4. **Pagination aggregation:** All list endpoints (search, database query, block children) use cursor-based pagination with max 100 results per page. The SDK provides `iteratePaginatedAPI` and `collectPaginatedAPI` helpers. Services use these to transparently aggregate all pages of results.

## Scaling Considerations

This is a CLI tool, not a server. "Scaling" means handling large Notion workspaces efficiently.

| Concern | Small workspace (<100 pages) | Large workspace (1K+ pages) | Very large workspace (10K+ pages) |
|---------|------------------------------|-----------------------------|------------------------------------|
| Search results | Single API call sufficient | Paginate, but show first page fast | Stream results, add `--limit` flag |
| Page rendering | Fast, few blocks | May have 500+ blocks across nesting — many API calls | Add `--depth` flag to limit recursion, progress indicator |
| Database query | Small result set, fast | 1000+ rows — must paginate | Stream output, add `--limit`, `--offset` flags |
| Rate limiting | Not a concern | Occasional 429s — SDK handles with retry | Frequent 429s — need request queuing, possibly parallel with concurrency limit |

### Scaling Priorities

1. **First bottleneck: Recursive block fetching speed.** A deeply nested page triggers sequential API calls. Mitigate with concurrent fetching (e.g., fetch children of multiple blocks in parallel, capped at 2-3 concurrent requests to stay under rate limit).

2. **Second bottleneck: Large database queries.** Databases with 5000+ entries take many paginated requests. Mitigate with streaming output (print rows as they arrive) and `--limit` flag.

## Anti-Patterns

### Anti-Pattern 1: Mixing CLI Concerns into Services

**What people do:** Pass Commander.js `options` objects into service functions. Services check `options.json` to decide what to return.

**Why it's wrong:** Services become untestable without mocking CLI. Can't reuse services for other interfaces (MCP server, programmatic API). Format decisions leak into data-fetching code.

**Do this instead:** Services return structured data. The command handler calls the output dispatcher with the data and format options. Services never import from `cli/` or know about output formats.

### Anti-Pattern 2: Giant Switch for Block Conversion

**What people do:** Single function with 25+ case branches for block type conversion, growing over time.

**Why it's wrong:** Untestable per-block-type. Adding a new type means modifying a massive function. Easy to introduce regressions.

**Do this instead:** Registry pattern (Pattern 4 above). Each block type has its own converter function. New types are added by registration, not modification.

### Anti-Pattern 3: Ignoring Pagination

**What people do:** Call the Notion API once and assume all results are returned. Works in testing with small datasets, breaks in production with real workspaces.

**Why it's wrong:** Notion returns max 100 items per call (default). Search, database queries, and block children lists can all exceed this. Missing pagination means silently dropping data.

**Do this instead:** Always use `collectPaginatedAPI` or `iteratePaginatedAPI` from the SDK. Never call a list endpoint without handling `has_more`.

### Anti-Pattern 4: Fetching All Blocks Before Any Output

**What people do:** Wait for entire recursive block tree to load before rendering anything.

**Why it's wrong:** A 500-block page with deep nesting may take 10+ seconds to fully fetch. The user sees nothing during this time. For agents piping output, the delay is especially painful.

**Do this instead:** For markdown output, consider streaming: render top-level blocks as they arrive, then fill in children. For JSON output, this is harder — the full tree is needed. Add a progress spinner for TTY mode during fetch.

### Anti-Pattern 5: Hardcoding Auth Token

**What people do:** Read `NOTION_TOKEN` only from environment variable. No persistent config.

**Why it's wrong:** Agents can't easily set env vars per-tool. Users have to export the variable in every shell session. Multiple workspaces require manual switching.

**Do this instead:** Support layered config: `--token` flag > env var `NOTION_TOKEN` > project `.ntnrc` > global `~/.ntnrc`. `ntn init` writes to config file.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Notion REST API** | Via `@notionhq/client` SDK v5.x | SDK handles auth headers, rate limiting (auto-retry on 429), pagination helpers. Use API version `2025-09-03` (latest). |
| **npm registry** | Package distribution as `@andrzejchm/notion-cli` | tsup bundles to single CJS file. `bin` field in package.json points to entry. |
| **Homebrew** | Formula or tap for macOS distribution | Requires standalone binary or npm-based formula. Consider pkg or similar for binary distribution. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI → Services | Direct function calls | Commands import service functions. Pass parsed IDs and filter objects, not raw CLI args. |
| Services → API Client | Via shared singleton | Services import the configured Notion client. Client is initialized once (lazy, on first use) with token from config. |
| Services → Rendering | None (decoupled) | Services return data. Commands call renderers. Services never import from `rendering/`. |
| Commands → Output | Via dispatcher | Commands pass data + format options to dispatcher. Dispatcher selects renderer. |
| Config → Auth | Auth reads/writes config | Auth manager uses config manager for persistence. Config is the storage layer; auth is the validation layer. |

## Build Order Implications

Components have clear dependencies. Build order should follow dependency direction:

```
Phase 1: Foundation
   Config Manager → Auth Manager → API Client
   (Can test: ntn init, token storage, API connectivity)

Phase 2: Core Services + Basic Output  
   Services (search, page, db) → Output Dispatcher (JSON only)
   (Can test: ntn search, ntn page --json, ntn db --json)

Phase 3: Block-to-Markdown Converter
   Rich text renderer → Block converter registry → Recursive tree renderer
   (Can test: ntn page → full markdown output)

Phase 4: TTY Formatting
   Table formatter → Property formatter → TTY output mode
   (Can test: ntn search, ntn db in terminal — formatted tables)

Phase 5: Polish
   Error handling UX → Progress indicators → Help text → Agent skill file
```

**Rationale:** Foundation must come first (everything depends on config/auth/client). JSON output is simpler than markdown and proves the service layer works. Block-to-markdown is the highest-complexity component and benefits from having stable services underneath. TTY formatting is cosmetic polish that doesn't affect agent usage (agents use JSON/markdown).

## Notion API Key Facts (from Official Docs)

These facts directly impact architecture decisions:

- **Rate limit:** 3 requests/second average, burst allowed. HTTP 429 with `Retry-After` header. SDK auto-retries up to 2 times by default.
- **Pagination:** All list endpoints paginate with max `page_size: 100`. Cursor-based via `start_cursor` / `next_cursor` / `has_more`.
- **Block children:** Only returns first-level children. `has_children: true` means you must make another call to get nested blocks. This is why recursive fetching is unavoidable.
- **Block types:** 25+ types supported by the API. Some types (`unsupported`) exist but can't be read. Column lists require 3 levels of fetching (column_list → columns → column content).
- **Rich text:** Array of segments, each with `plain_text`, `annotations` (bold/italic/etc), `href`, and type-specific data. Up to 2000 chars per text segment.
- **API version:** Latest is `2025-09-03`. SDK v5.x targets this version. Previous `2022-06-28` is deprecated. The `databases.query` endpoint is now `dataSources.query` in SDK v5+.
- **SDK features:** Built-in retry, `collectPaginatedAPI` and `iteratePaginatedAPI` helpers, TypeScript type guards (`isFullPage`, `isFullBlock`, etc.), configurable timeout (default 60s).

## Sources

- Notion API Reference: https://developers.notion.com/reference/intro (fetched 2026-02-26) — **HIGH confidence**
- Notion Block Reference: https://developers.notion.com/reference/block (fetched 2026-02-26) — **HIGH confidence**
- Notion Search API: https://developers.notion.com/reference/post-search (fetched 2026-02-26) — **HIGH confidence**
- Notion Rate Limits: https://developers.notion.com/reference/request-limits (fetched 2026-02-26) — **HIGH confidence**
- Notion API Versioning: https://developers.notion.com/reference/versioning (fetched 2026-02-26) — **HIGH confidence**
- Notion Block Children API: https://developers.notion.com/reference/get-block-children (fetched 2026-02-26) — **HIGH confidence**
- @notionhq/client SDK: https://github.com/makenotion/notion-sdk-js (fetched 2026-02-26) — **HIGH confidence** — v5.9.0 latest, supports 2025-09-03 API

---
*Architecture research for: ntn — Notion CLI*
*Researched: 2026-02-26*
