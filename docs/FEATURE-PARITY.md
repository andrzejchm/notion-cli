# Feature Parity: notion-cli vs Notion MCP

> Compared against the official Notion MCP server tools (2026-03).
> This document tracks gaps and serves as a prioritized roadmap for closing them.

**Legend:**
- **CLI** = `@andrzejchm/notion-cli` (this repo, v0.8.0)
- **MCP** = Official Notion MCP server

---

## Current Parity Summary

| Area | CLI | MCP | Parity |
|------|-----|-----|--------|
| Search | Basic keyword | Semantic + AI + connected sources + date/creator filters | Partial |
| Page read | Markdown via API | Markdown + discussions + transcripts | Partial |
| Page create | Under pages only | Under pages, databases, data sources; batch; templates; icon/cover | Partial |
| Page edit | Surgical replace via `--range` | Search-and-replace (multi-op), full replace, template apply, verification | Partial |
| Page properties | Read + write via `update --prop` | Full read + write (update any property) | ✅ Parity |
| Move pages | - | Batch move to any parent | Gap |
| Duplicate pages | - | Duplicate with async content copy | Gap |
| Archive/delete | `archive` | Trash pages | ✅ Parity |
| Database create | - | SQL DDL `CREATE TABLE` syntax | Gap |
| Database schema update | Read-only schema | `ADD/DROP/RENAME/ALTER COLUMN` via DDL | Gap |
| Database views | - | Create + update 10 view types with DSL | Gap |
| Comments | Page-level add + list | Page-level + inline (selection-anchored) + reply to thread + rich text | Partial |
| Users | List all | List + search + fetch by ID + fetch self | Partial |
| Teams | - | List teamspaces + search | Gap |
| Create pages in DB | `create-page --parent <db>` with `--prop` | Full property support, date/place/checkbox expanded formats | ✅ Parity |
| Batch operations | - | Create up to 100 pages, move up to 100 pages | Gap |
| Icon / Cover | `--icon` / `--cover` on `create-page` | Set emoji/image icon + cover on create and update | Partial |

---

## Prioritized Gaps (Roadmap)

Ordered by impact for AI-agent workflows first, then developer productivity.

### Tier 1 - High Impact (core agent workflows)

These gaps directly limit what an AI agent can accomplish through the CLI compared to using MCP directly.

#### 1. ✅ Update page properties (shipped v0.7.0)
**MCP:** `update_properties` command — set title, status, dates, select, people, checkbox, numbers, etc. Supports `null` to clear.
**CLI:** `notion update <id> --prop "Status=Done"` — supports title, rich_text, select, status, multi_select, number, checkbox, url, email, phone_number, date.
**Status:** Shipped in v0.7.0.

#### 2. ✅ Create pages in databases (with properties) (shipped v0.8.0)
**MCP:** `create-pages` supports `data_source_id` parent with full property map including expanded date, place, checkbox formats.
**CLI:** `notion create-page --parent <db-id> --title "Task" --prop "Status=To Do"` — auto-detects database vs page parent. Supports `--icon` and `--cover`.
**Status:** Shipped in v0.8.0.

#### 3. ✅ Archive / trash pages (shipped v0.9.0)
**MCP:** `update-page` with property changes or page operations; `update_data_source` with `in_trash: true`.
**CLI:** `notion archive <id>` — archives (trashes) a page. Supports `--json` for full page output.
**Status:** Shipped in v0.9.0.

#### 4. Search filters (date range, creator)
**MCP:** `created_date_range` (start/end dates), `created_by_user_ids` filter, scoped search within page/database/teamspace.
**CLI:** Keyword-only search with `--type` filter.
**Why important:** Agents searching for "recent" items or "my tasks" need date and creator filters to get relevant results without scanning everything.
**Suggested flags:** `--created-after`, `--created-before`, `--created-by`

### Tier 2 - Medium Impact (power-user and advanced agent workflows)

#### 5. Inline / anchored comments
**MCP:** `selection_with_ellipsis` targets a specific block; `discussion_id` replies to existing threads. Rich text with mentions, dates, links.
**CLI:** Page-level comments only. Plain text only.
**Why:** Agents doing code/doc review need to comment on specific sections, not just drop a page-level note. Thread replies keep conversations organized.
**Suggested flags:** `notion comment <id> -m "text" --anchor "## Section...content"` / `--reply-to <discussion-id>`

#### 6. Create databases
**MCP:** `CREATE TABLE` DDL with full type system (select, relation, rollup, formula, unique_id, etc.).
**CLI:** No equivalent.
**Why:** Agents building project scaffolds or workflows need to create structured databases, not just pages.
**Suggested command:** `notion create-db --parent <id> --title "Tasks" --schema "Name TITLE, Status SELECT(Todo,Done)"`

#### 7. Move pages
**MCP:** Batch move up to 100 pages/databases to a new parent (page, database, data source, or workspace).
**CLI:** No equivalent.
**Why:** Reorganizing content (moving completed items to archive, restructuring projects) is a common agent task.
**Suggested command:** `notion move <id...> --to <parent-id>`

#### 8. Update database schema
**MCP:** `ADD COLUMN`, `DROP COLUMN`, `RENAME COLUMN`, `ALTER COLUMN SET` via DDL.
**CLI:** Read-only schema via `notion db schema`.
**Why:** Evolving database structure (adding a new status option, renaming a field) without leaving the terminal.
**Suggested command:** `notion db alter <id> --add "Priority SELECT(High,Medium,Low)" --rename "Status:Project Status"`

#### 9. Multi-operation content editing
**MCP:** `update_content` accepts an array of `{ old_str, new_str }` pairs (up to 100) in a single call, with `replace_all_matches` option.
**CLI:** `notion edit-page` supports single `--range` replacement. No batch search-and-replace.
**Why:** Agents making multiple edits to a page (updating several sections) currently need multiple CLI invocations.
**Suggested approach:** Support multiple `--replace "old...new"` flags or a JSON patch file.

#### 10. Duplicate pages
**MCP:** `duplicate-page` — async copy of any accessible page.
**CLI:** No equivalent.
**Why:** Templating workflows — copy a template page to start a new project/sprint.
**Suggested command:** `notion duplicate <id>`

### Tier 3 - Lower Impact (nice-to-have, niche workflows)

#### 11. Database views (create + update)
**MCP:** 10 view types (table, board, calendar, timeline, gallery, list, form, chart, map, dashboard) with DSL for filters, sorts, grouping.
**CLI:** No equivalent.
**Why:** Mostly a UI concern; agents rarely need to create views programmatically. But useful for project setup automation.

#### 12. Page icon and cover
**MCP:** Set emoji/custom emoji/image URL as icon; set image URL as cover on create and update.
**CLI:** No equivalent.
**Why:** Cosmetic but helps agents create polished pages. Low effort to add as flags.
**Suggested flags:** `--icon "🚀"` / `--cover "https://..."`

#### 13. Teams / teamspaces listing
**MCP:** `get-teams` with name search.
**CLI:** No equivalent.
**Why:** Rarely needed by agents. Useful for workspace discovery in large organizations.
**Suggested command:** `notion teams`

#### 14. Scoped search (within page / database / teamspace)
**MCP:** `page_url`, `data_source_url`, `teamspace_id` parameters scope search.
**CLI:** Global search only.
**Why:** Useful for agents working within a specific project area, but global search + filtering usually suffices.
**Suggested flags:** `--within <id>`

#### 15. Page verification
**MCP:** `update_verification` — mark pages as verified with optional expiry (Business/Enterprise only).
**CLI:** No equivalent.
**Why:** Enterprise-only feature, limited audience.

#### 16. Template application
**MCP:** Apply database templates on create and update (template content is async).
**CLI:** No equivalent.
**Why:** Useful for standardized page creation but requires database template discovery first.
**Suggested flags:** `--template <template-id>`

#### 17. Batch page creation
**MCP:** Create up to 100 pages in a single call.
**CLI:** One page per invocation.
**Why:** Performance optimization for bulk workflows. Can be scripted with shell loops for now.

#### 18. Advanced user lookup
**MCP:** Search users by name/email, fetch by ID, fetch authenticated user (`self`).
**CLI:** `notion users` lists all, no search or lookup.
**Suggested flags:** `notion users --search "john"` / `notion users --id <uuid>` / `notion users --me`

#### 19. Fetch page discussions inline
**MCP:** `include_discussions: true` on fetch shows discussion anchors in page content; `get-comments` with `include_all_blocks`, `include_resolved`.
**CLI:** `notion comments` shows page-level comments only, no block-level discussions, no resolved filter.
**Suggested flags:** `--all-blocks` / `--include-resolved`

---

## What CLI Does That MCP Doesn't

The CLI isn't just chasing MCP parity — it has unique strengths:

| CLI Feature | MCP Equivalent |
|---|---|
| `notion open <id>` — open in browser | No equivalent |
| `notion ls` — list all accessible content | Must use search with empty query |
| `notion db schema` — human-readable schema | Must fetch database and parse response |
| `notion auth` — multi-profile management with OAuth | N/A (MCP uses connection-level auth) |
| `notion completion bash/zsh/fish` — shell completions | N/A |
| `--verbose` — debug API requests | N/A |
| Pipe-friendly output (stdin → page, table → stdout) | N/A (MCP is programmatic, not pipe-based) |
| URL → ID normalization everywhere | Both support this |
| `.notion.yaml` per-project config | N/A |

---

## Implementation Notes

- Tier 1 items (1-4) should be tackled before any Tier 2 work
- Items 1 and 2 can share infrastructure (property value parsing, `--prop` flag syntax)
- Item 3 (archive) is likely a small addition once property updates work (archive is a property)
- Items 6 and 8 (database create/alter) can share a schema DSL parser
- The CLI should NOT try to replicate MCP's SQL DDL syntax — a simpler flag-based approach fits CLI ergonomics better

---

*Last updated: 2026-03-23*
*CLI version compared: 0.8.0*
*MCP version compared: Official Notion MCP (2026-03)*
