# Pitfalls Research

**Domain:** Notion API CLI integration (read-only)
**Researched:** 2026-02-26
**Confidence:** HIGH (primarily sourced from official Notion API documentation)

## Critical Pitfalls

### Pitfall 1: Recursive Block Fetching Explodes API Calls and Hits Rate Limits

**What goes wrong:**
The Notion API's "Retrieve block children" endpoint returns only the **first level** of children. To get a complete page, you must check each block's `has_children` property and recursively call the endpoint for every nested block. A moderately complex page with toggles, callouts, nested lists, columns, and synced blocks can easily require 20-50+ API calls. With the rate limit of **3 requests per second average**, fetching a single large page can take 10-20 seconds and risk rate limiting.

**Why it happens:**
Developers assume "retrieve block children" gives the full page tree. It doesn't — it's one level deep. Notion's block model is arbitrarily deep: lists inside toggles inside callouts inside columns. Each nesting level requires a separate API call per parent block.

**How to avoid:**
- Build a recursive block walker with **concurrency control** from day one. Use a semaphore/queue limiting concurrent requests to ~2-3 to stay under rate limits.
- Implement **exponential backoff** with `Retry-After` header respect for 429 responses.
- Add a **max depth parameter** (default ~10) to prevent infinite recursion on malformed/circular synced blocks.
- Consider **breadth-first** fetching with batching: fetch all children at one level, then all children at the next level. This allows better progress reporting.

**Warning signs:**
- Simple test pages work fine but real-world pages time out or return 429 errors.
- Tests use only flat pages with no nested blocks.
- No rate limiting logic in the API client layer.

**Phase to address:**
Core API client phase — the block fetching infrastructure must have rate limiting and recursive walking built in from the start.

---

### Pitfall 2: Search Endpoint Is Title-Only and Eventually Consistent

**What goes wrong:**
The Notion Search API (`POST /v1/search`) searches **titles only**, not page content. Developers build a search feature expecting full-text search and users get confused when searching for content inside a page returns nothing. Additionally, Search is **eventually consistent** — newly created or recently shared pages may not appear for seconds to minutes.

**Why it happens:**
The API docs state: "Returns all pages or data_sources that have **titles** that include the query param." This is easy to miss. The endpoint also only returns pages/databases **shared with the integration**, not everything in the workspace.

**How to avoid:**
- Document clearly in the CLI help text that `ntn search` searches **page and database titles**, not content.
- Consider a `--scope` flag or subcommand distinction: `ntn search` for titles, and potentially a separate content-searching approach (fetch + local search) for power users.
- The Search endpoint's `sort` parameter only supports `last_edited_time` — no relevance ranking. Design the output accordingly.
- For the CLI `filter` parameter: you can filter by `object: "page"` or `object: "data_source"` — expose this as a `--type` flag.

**Warning signs:**
- Users report "search doesn't find my page" — it exists but was recently shared with the integration.
- Users search for content phrases and get zero results.

**Phase to address:**
Search command phase — ensure documentation, help text, and error messaging set correct expectations.

---

### Pitfall 3: Notion File URLs Expire After 1 Hour

**What goes wrong:**
Notion-hosted files (images, PDFs, attachments uploaded to Notion) have signed URLs that **expire**. The `file` type objects include an `expiry_time` field. If the CLI outputs these URLs and a user or agent tries to use them later, they get 403 errors. This affects images in markdown output, file block links, page covers, and icons.

**Why it happens:**
The Notion API returns temporary signed S3 URLs for internally-hosted files. External URLs (`type: "external"`) don't expire, but Notion-hosted ones do. Developers often don't distinguish between the two types.

**How to avoid:**
- Always check the `type` field of file objects: `"file"` (Notion-hosted, expires) vs. `"external"` (user-provided URL, doesn't expire).
- In markdown output, add a comment or note indicating the URL is temporary for Notion-hosted files.
- For images in markdown: output `![image](url)` with a comment like `<!-- expires: 2026-02-26T12:00:00Z -->` so agents/users know.
- Consider a `--download-files` flag that saves files locally instead of linking.

**Warning signs:**
- Image links in output markdown stop working after ~1 hour.
- Agents caching CLI output find broken image references.

**Phase to address:**
Block-to-markdown conversion phase — handle file type distinction when generating markdown output.

---

### Pitfall 4: "Unsupported" Block Types Silently Drop Content

**What goes wrong:**
The Notion API does **not support all block types**. Unsupported blocks appear with `type: "unsupported"` and contain no useful content. If the CLI silently skips these, users lose content without knowing. Current unsupported types are not well-documented — they can change across API versions.

**Why it happens:**
Official docs state: "Any unsupported block types appear in the structure, but contain a type set to `unsupported`." Developers either skip these blocks entirely or crash on unexpected types. New block types Notion adds to the UI may initially be unsupported in the API.

**How to avoid:**
- **Never silently drop blocks.** When encountering `unsupported` type, output a visible placeholder: `<!-- unsupported block type -->` in markdown or include in JSON output.
- Build the block type handler with a **default/fallback case** that gracefully handles unknown types.
- Log warnings for unsupported blocks so users know content is missing.
- Track the list of known block types and flag new ones in debug output.

**Warning signs:**
- Output markdown is shorter than expected for content-rich pages.
- Users report "missing content" but the page looks fine in Notion.
- No test coverage for unknown/unsupported block types.

**Phase to address:**
Block-to-markdown conversion phase — the converter must have an explicit fallback strategy for unsupported and unknown types.

---

### Pitfall 5: Rich Text Annotations Create Combinatorial Markdown Complexity

**What goes wrong:**
Notion's rich text model uses an `annotations` object per text segment with independent boolean flags: `bold`, `italic`, `strikethrough`, `underline`, `code`, `color`. A single paragraph can contain dozens of rich text segments with different annotation combinations. Converting this to markdown requires handling overlapping styles (bold + italic + code), inline links with annotations, mentions (user, page, database, date), and equations — all in the correct order.

**Why it happens:**
Markdown has limited expressiveness compared to Notion's rich text. There's no markdown equivalent for `underline` or `color`. Overlapping styles like `***bold italic***` need careful nesting. Developers build a naive converter that handles simple cases but breaks on real-world content.

**How to avoid:**
- Build rich text conversion as an isolated, thoroughly tested module.
- Handle each annotation independently and compose them: inner-to-outer wrapping (code → italic → bold).
- Define a clear strategy for **lossy conversions**: underline → no markdown equivalent (drop or use HTML `<u>` tags), color → drop in plain markdown or use a custom notation.
- Handle mentions properly: `@user` → user name, `@page` → page title with link, `@date` → formatted date.
- Handle equations: inline `$expression$` or block `$$expression$$`.
- Test with real Notion pages that have complex formatting.

**Warning signs:**
- Rich text tests only cover single-annotation cases.
- No handling for mentions, equations, or links within annotated text.
- Markdown output has unmatched `*` or `` ` `` characters.

**Phase to address:**
Block-to-markdown conversion phase — rich text is the foundational conversion layer everything else depends on.

---

### Pitfall 6: Pagination Handling Is Inconsistent Across Endpoints

**What goes wrong:**
Six different endpoints use pagination, but with subtle differences. GET endpoints accept pagination params as **query strings**, POST endpoints accept them in the **request body**. Property items have their own pagination with `next_url`. The max `page_size` is 100 for all endpoints, and default is also 100. Developers build a generic pagination helper that works for one endpoint but fails for others.

**Why it happens:**
The pagination interface looks uniform (`has_more`, `next_cursor`, `start_cursor`, `page_size`) but the parameter location differs. Additionally, some property types (`title`, `rich_text`, `relation`, `people`) are **paginated at the property level** — the "Retrieve a page" endpoint truncates these at 25 items, requiring separate "Retrieve a page property item" calls.

**How to avoid:**
- Build a **generic paginator** but parameterize it for GET vs. POST parameter placement.
- For "Retrieve a page" responses: always check if `title`, `rich_text`, `relation`, or `people` properties have more than 25 items. If so, use the property-item endpoint for complete values.
- In database queries: always paginate fully. Large databases can have thousands of entries.
- Test pagination with edge cases: 0 results, exactly 100 results (boundary), 101+ results.

**Warning signs:**
- Database queries only return first 100 results.
- Page properties show truncated titles or missing relations.
- Different behavior between search results and database queries.

**Phase to address:**
Core API client phase — pagination must be a robust, tested utility used by all endpoint wrappers.

---

### Pitfall 7: Column Lists Require Triple-Nested API Calls

**What goes wrong:**
Column layouts in Notion require **three levels** of API calls to resolve: (1) get the `column_list` block, (2) get its children which are `column` blocks, (3) get each column's children which are the actual content blocks. This is explicitly documented but easily missed. Each column requires its own API call, multiplying the request count.

**Why it happens:**
The `column_list` block itself contains no content — its `column_list` property is empty (`{}`). Same for `column` blocks. Content lives inside columns as their children. This is a three-level fetch minimum, with additional levels for nested content inside columns.

**How to avoid:**
- The recursive block walker (Pitfall 1) handles this naturally IF it correctly follows `has_children: true` for column_list and column blocks.
- For markdown output: decide a column rendering strategy upfront. Options:
  - Render columns sequentially (Column 1 content, then Column 2 content) with a separator.
  - Use an HTML table for side-by-side display (works in some markdown renderers).
  - Add column indicators: `<!-- column 1 -->` ... `<!-- column 2 -->`.
- Budget extra API calls for pages with column layouts.

**Warning signs:**
- Column content renders as empty in output.
- Tests don't include column layout pages.

**Phase to address:**
Block-to-markdown conversion phase — columns need explicit handling in the block type mapping.

---

### Pitfall 8: Synced Blocks Create Duplicate Content and Potential Infinite Loops

**What goes wrong:**
Synced blocks have two variants: **original** (`synced_from: null`) and **reference** (`synced_from: { block_id: "..." }`). Reference synced blocks point to the original. If you follow the reference to fetch the original's children, you get the content. But if synced blocks reference each other in a chain, or if the original is not shared with the integration, you get either duplicate content or 404 errors.

**Why it happens:**
Developers treat synced blocks like regular blocks with children. The reference variant has `has_children: true` but its children are the **same** as the original block's children. Fetching both produces duplicates.

**How to avoid:**
- For **original** synced blocks (`synced_from: null`): fetch children normally.
- For **reference** synced blocks (`synced_from: { block_id }}`): you have two choices:
  - Fetch the children of the reference (API returns the synced content) — simplest approach.
  - Fetch the original block's children using `synced_from.block_id` — gives canonical source.
- Track visited block IDs in a set to prevent infinite loops.
- Handle 404 gracefully when the original synced block is not shared with the integration.

**Warning signs:**
- Same content appears multiple times in output.
- Errors when resolving synced block references.
- No cycle detection in block traversal.

**Phase to address:**
Block-to-markdown conversion phase — synced blocks need specific handling logic.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding API version string | Faster to ship | Version upgrade requires code changes everywhere | Never — use a single constant/config |
| No rate limit handling | Simpler code | Breaks on any moderately-sized workspace | Never — 3 req/sec limit is hit easily |
| Skipping pagination for "small" endpoints | Fewer lines of code | Silent data truncation when data grows | Never — always paginate fully |
| Flat block fetching (no recursion) | Works for simple pages | Missing all nested content (toggles, lists, columns) | Only for MVP/prototype, must fix before v1 |
| String concatenation for markdown | Fast to implement | Breaks on edge cases (nested formatting, special chars) | Only for initial prototype |
| Synchronous sequential API calls | Simpler control flow | 10x slower page fetching | Only for initial prototype, refactor to controlled concurrency |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Notion Auth (Internal Token) | Storing token in plaintext config files | Use OS keychain, environment variable, or encrypted config file. Token prefix is `ntn_` (new format) or `secret_` (legacy). |
| Notion Auth | Assuming token has access to all workspace pages | Integration only sees pages **explicitly shared** with it via the "Add connections" menu in Notion UI. 404 means not shared, not nonexistent. |
| Notion API Version Header | Omitting `Notion-Version` header or using old version | **Required header.** Latest: `2025-09-03`. SDK sets it automatically, but raw HTTP calls must include it. Old versions may miss new block types or have different property names. |
| Notion SDK v5+ | Using SDK v5 with API version `2022-06-28` | SDK v5.0.0+ dropped support for `2022-06-28` and earlier. Only works with `2025-09-03`+. Check [compatibility table](https://github.com/makenotion/notion-sdk-js). |
| Page ID Extraction | Requiring users to format UUIDs with hyphens | Accept IDs both with and without hyphens. Notion URLs contain 32-char hex without hyphens. The API accepts both formats. |
| Notion Search | Expecting full-text content search | Search is **title-only**. Only returns pages/databases shared with the integration. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential block recursion | Large pages take 30+ seconds to fetch | Use controlled concurrency (2-3 parallel requests) with rate limit awareness | Pages with >10 nested blocks |
| Fetching all database entries without filtering | Timeout on large databases, rate limit exhaustion | Use database query filters, expose `--filter` and `--limit` flags | Databases with >500 entries |
| Not paginating Search results | Only first 100 results returned, user thinks that's all | Always paginate to completion or respect a `--limit` flag | Workspaces with >100 shared pages |
| Fetching full page content for database listing | One API call per page just to show a table of entries | Use page properties (already in query response) for listing, only fetch blocks when user requests specific page | Database with >20 entries |
| No response caching | Repeated requests for same content (e.g., synced block originals) | Cache block content by ID within a single command execution | Pages with multiple synced block references to same original |
| Unbounded rich text property fetching | Timeout on pages with very long rich_text or title properties | Paginate property items, set reasonable limits | Pages with >25 items in title/rich_text/relation/people properties |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging/displaying full integration token | Token compromise — full workspace access | Only show last 4 chars in debug output. Store token securely (keychain/env var). |
| Not validating token format before API call | Confusing error messages from API | Validate token starts with `ntn_` or `secret_` before making requests. |
| Including token in error messages or stack traces | Token leaked to logs, error reporting | Sanitize all error output to redact tokens. |
| Storing token in git-trackable config file | Token committed to version control | Use `.env` (with `.gitignore`), OS keychain, or XDG-compliant config in `~/.config/`. Default config location must not be inside project directory. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication for large pages | User thinks CLI is hung, kills process | Show progress: "Fetching blocks... (24/48 blocks)" for TTY mode |
| Outputting raw Notion JSON to terminal | Unreadable wall of text | TTY mode: formatted tables/markdown. Piped mode: JSON/markdown. Detect with `process.stdout.isTTY`. |
| 404 error without explanation | User thinks page doesn't exist | Distinguish: "Page not found — ensure the page is shared with your integration via Notion's 'Add connections' menu" |
| Markdown output loses all color/formatting metadata | Agents miss callout importance, color-coded content | Include callout emoji/icon in output. Consider `> **Note:** content` for callouts. Add metadata comments for colors if needed. |
| Tables rendered as markdown tables without alignment | Hard to read wide tables | Detect terminal width, truncate columns intelligently, or use vertical layout for narrow terminals |
| Database query returns confusing property types | Users don't understand formula/rollup/relation values | Format property values human-readably: dates as readable strings, relations as page titles, formulas as computed values |

## "Looks Done But Isn't" Checklist

- [ ] **Block recursion:** Tests include pages with 3+ levels of nesting (toggle inside callout inside column) — verify all content appears in output
- [ ] **Rich text:** Tests include paragraphs with mixed bold+italic+code+link annotations — verify markdown renders correctly
- [ ] **Pagination:** Tests include databases with >100 entries — verify all entries are returned
- [ ] **Property pagination:** Tests include pages with >25 relations or very long titles — verify full values are retrieved
- [ ] **Column layouts:** Tests include pages with column_list blocks — verify all column content appears
- [ ] **Synced blocks:** Tests include pages with synced block references — verify no duplicates, no infinite loops
- [ ] **Unsupported blocks:** Tests include pages with unknown/unsupported block types — verify graceful placeholder, no crash
- [ ] **File URLs:** Tests verify distinction between expiring Notion-hosted URLs and permanent external URLs
- [ ] **Rate limiting:** Tests simulate 429 responses — verify retry logic with exponential backoff
- [ ] **Empty states:** Tests include empty pages, empty databases, databases with no matching filter — verify clean output
- [ ] **Token validation:** Test with invalid token, expired token, token without access to requested page — verify helpful error messages
- [ ] **Numbered lists:** Tests verify correct numbering (Notion stores each item independently, numbering must be computed by the client)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No rate limiting (429 errors in production) | LOW | Add `Retry-After` header handling and exponential backoff to API client. No architectural change needed. |
| Flat block fetching (missing nested content) | MEDIUM | Add recursive walker. Requires refactoring the block-to-markdown pipeline to handle a tree instead of a flat list. |
| No pagination (truncated data) | LOW | Add pagination loop to each endpoint wrapper. Straightforward addition. |
| Naive rich text conversion (broken markdown) | MEDIUM | Rewrite rich text converter with proper annotation compositing. Requires comprehensive test suite with real-world examples. |
| Token stored in project directory | LOW | Move to `~/.config/ntn/` or OS keychain. Add migration helper in next release. |
| Synchronous block fetching (slow) | MEDIUM | Refactor to controlled concurrency. Requires adding a request queue/semaphore. Architecture stays the same. |
| Silently dropped unsupported blocks | LOW | Add fallback handler that emits placeholder. Straightforward addition to block type switch. |
| Hardcoded API version | LOW | Extract to constant/config. Find-and-replace plus add config option. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Recursive block fetching + rate limits | Core API client | Fetch a complex real-world page without 429 errors, all nested content present |
| Search is title-only | Search command | Help text clearly states "searches titles", users aren't confused |
| File URL expiration | Block-to-markdown conversion | Output distinguishes expiring vs permanent URLs, includes expiry metadata |
| Unsupported block types | Block-to-markdown conversion | Unknown block type in test data produces visible placeholder, no crash |
| Rich text annotation complexity | Block-to-markdown conversion | Complex annotated text round-trips correctly, no unmatched markdown syntax |
| Pagination inconsistencies | Core API client | All paginated endpoints tested with >100 results, all data retrieved |
| Column list triple-fetch | Block-to-markdown conversion | Column pages render all column content correctly |
| Synced block handling | Block-to-markdown conversion | No duplicate content, no infinite loops, graceful 404 for unshared originals |
| Token security | Auth/init command | Token stored in secure location, not displayed in logs, validated before use |
| Numbered list ordering | Block-to-markdown conversion | Sequential `numbered_list_item` blocks render with correct 1, 2, 3... numbering |

## Sources

- Notion API Reference — Errors: https://developers.notion.com/reference/errors (HIGH confidence)
- Notion API Reference — Request Limits: https://developers.notion.com/reference/request-limits (HIGH confidence)
- Notion API Reference — Block types: https://developers.notion.com/reference/block (HIGH confidence)
- Notion API Reference — Retrieve block children: https://developers.notion.com/reference/get-block-children (HIGH confidence)
- Notion API Reference — Search: https://developers.notion.com/reference/post-search (HIGH confidence)
- Notion API Reference — Versioning: https://developers.notion.com/reference/versioning (HIGH confidence)
- Notion API Reference — Pagination: https://developers.notion.com/reference/intro#pagination (HIGH confidence)
- Notion API Reference — Retrieve a page property item: https://developers.notion.com/reference/retrieve-a-page-property (HIGH confidence)
- Notion API Guide — Working with page content: https://developers.notion.com/docs/working-with-page-content (HIGH confidence)

---
*Pitfalls research for: Notion CLI (ntn) — API integration*
*Researched: 2026-02-26*
