# Task 3: Expose `--range` on `edit-page` Command

<objective>
Add an optional `--range <selector>` flag to `notion edit-page` that replaces only a matched section of the page instead of always replacing the entire contents.
</objective>

<requirements>
MUST:
- Add `--range <selector>` option to `edit-page`. Type: string, optional.
- Add `--allow-deleting-content` boolean flag to `edit-page`. Defaults to `false` when `--range` is used. Should be `true` by default (or implied) when no `--range` is provided (preserving current full-page-replace behavior).
- When `--range` is provided, pass it as `options.range` to `replaceMarkdown()`.
- When `--range` is omitted, behavior must be identical to current (full-page replace with `allow_deleting_content: true`).
- Update the command description from `"replace the entire content of a Notion page with new markdown"` to `"replace a Notion page's content — full page or a targeted section"`.
- The `--range` option description must explain the ellipsis format: `ellipsis selector to replace only a section, e.g. "## My Section...last line"`.
- If the API returns a `validation_error` (selector not found in page), surface it as a `CliError` with a helpful suggestion: explain the ellipsis format and suggest running `notion read <id>` to inspect the page content.

MUST NOT:
- Require `--range` — it must remain optional.
- Change behavior when `--range` is absent.
- Allow `--allow-deleting-content` to silently default to `true` when a range is provided (user must opt in).
</requirements>

<acceptance_criteria>
- [ ] `notion edit-page <id> -m "content"` — replaces entire page (no regression)
- [ ] `notion edit-page <id> -m "content" --range "## Section...end"` — calls `replaceMarkdown` with `range` set and `allowDeletingContent: false`
- [ ] `notion edit-page <id> -m "content" --range "..." --allow-deleting-content` — calls `replaceMarkdown` with `allowDeletingContent: true`
- [ ] Validation error from SDK is caught and re-thrown as `CliError` with selector format hint
- [ ] `notion edit-page --help` shows `--range` and `--allow-deleting-content` options with descriptions
- [ ] TypeScript compiles cleanly
</acceptance_criteria>

<constraints>
MAY:
- Detect `validation_error` by checking the Notion SDK error code field
- Keep the existing `readStdin()` helper in this file

MUST NOT:
- Change the success message `"Page content replaced.\n"` — keep it consistent
- Remove `replaceMarkdown`'s full-page fallback for empty pages
</constraints>

<context>
- File to edit: `src/commands/edit-page.ts`
- Updated service: `src/services/write.service.ts` (from Task 1)
- Pattern for error wrapping: `src/errors/error-handler.ts` and `src/errors/cli-error.ts`
- Commander boolean flag pattern: `.option('--flag', 'description')` (no argument = boolean)
</context>

<verification>
```
notion edit-page <page-id> -m "## Section\n\nUpdated content" --range "## Section...old content"
# Expected: "Page content replaced." — only the section changed
notion edit-page <page-id> -m "text" --range "## NoSuch...section"
# Expected: error with selector hint
notion edit-page <page-id> -m "full replacement"
# Expected: "Page content replaced." — entire page replaced (existing behavior)
```
</verification>
