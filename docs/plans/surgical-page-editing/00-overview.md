# Surgical Page Editing Implementation Plan

<goal>
Expose the Notion API's ellipsis-based content selectors to the CLI so users can insert content after a specific section or replace only a matched section, without touching the rest of the page.
</goal>

<problem>
Currently `notion edit-page` replaces the entire page and `notion append` always adds content at the very end. The underlying Notion API (`PATCH /v1/pages/{id}/markdown`) already supports targeting specific sections via ellipsis selectors (`"start text...end text"`), but neither command exposes those parameters. This forces users to read the whole page, edit it locally, and write it back — a fragile workflow that overwrites unrelated content.
</problem>

<architecture>
The Notion API offers two surgical modes via the same `updateMarkdown` endpoint that the CLI already calls:

- **`insert_content` + `after` selector** — inserts new markdown _after_ a matched content range. Currently `appendMarkdown()` never passes `after`, so content always lands at the end of the page.
- **`replace_content_range` + `content_range` selector** — replaces only the matched range. Currently `replaceMarkdown()` builds a range that spans the _entire_ page, so it always replaces everything.

The ellipsis selector format: `"start text...end text"` (matches from first occurrence of start to end of end snippet). For an exact single-paragraph match, pass the text itself with no ellipsis.

**Changes required:**

1. `appendMarkdown()` in `write.service.ts` — accept an optional `after` selector and pass it through.
2. `replaceMarkdown()` in `write.service.ts` — accept an optional `range` selector. When provided, use it directly as `content_range` instead of building a full-page range. When provided with `allow_deleting_content`, forward that flag too.
3. `append` command — add `--after <selector>` option.
4. `edit-page` command — add `--range <selector>` option and `--allow-deleting-content` flag.
5. Update `docs/skills/using-notion-cli/SKILL.md` with new flags.
</architecture>

<tech_stack>
- TypeScript (strict)
- Commander.js v14
- `@notionhq/client` v5 SDK (`client.pages.updateMarkdown`)
- Biome for lint/format
- Node.js ≥ 22, ESM only
</tech_stack>

<tasks>
1. Extend write service for surgical operations - `01-write-service.md`
2. Expose `--after` on `append` command - `02-append-command.md`
3. Expose `--range` on `edit-page` command - `03-edit-page-command.md`
4. Update skill documentation - `04-update-skill-docs.md`
5. Integration Verification - `05-integration-verification.md`
</tasks>

<dependencies>
- Task 2 depends on Task 1 (uses updated `appendMarkdown` signature)
- Task 3 depends on Task 1 (uses updated `replaceMarkdown` signature)
- Task 4 depends on Tasks 2 and 3 (documents completed CLI flags)
- Task 5 depends on all other tasks
- Tasks 2 and 3 can run in parallel after Task 1
</dependencies>

<global_constraints>
- Do NOT change the public API of existing commands in a breaking way (new flags must be optional, defaults must preserve current behavior)
- Follow existing code style in `src/commands/` and `src/services/`
- All new behavior must be covered by tests
- No new runtime dependencies
- Selector validation errors from the API (`validation_error`) should surface as a helpful `CliError` with a suggestion explaining the ellipsis format
</global_constraints>

<alternatives_considered>
- **Block-level API** (`PATCH /v1/blocks/{id}`) — requires fetching block IDs first, converting markdown back to blocks, and is more fragile. The markdown endpoint already handles this transparently and is the pattern the codebase uses throughout.
- **New `replace-section` command** — rejected in favor of adding flags to existing commands to keep the surface area small and consistent.
- **Regex-based local editing** — fetch markdown locally, regex-replace, write back. Fragile and races with concurrent edits. The server-side selector is authoritative.
</alternatives_considered>
