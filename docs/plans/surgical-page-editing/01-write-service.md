# Task 1: Extend Write Service for Surgical Operations

<objective>
Update `appendMarkdown()` and `replaceMarkdown()` in `src/services/write.service.ts` to accept optional content selectors, passing them through to the Notion SDK so surgical inserts and partial-range replaces become possible.
</objective>

<requirements>
MUST:
- `appendMarkdown(client, pageId, markdown, options?)` — accept an optional `options.after` string. When provided, pass it as `insert_content.after` in the SDK call. When omitted, behavior must be identical to current (append to end).
- `replaceMarkdown(client, pageId, newMarkdown, options?)` — accept an optional `options.range` string. When provided, use it directly as `content_range` instead of calling `buildContentRange()`. When omitted, behavior must be identical to current (full-page replace).
- `replaceMarkdown` — also accept `options.allowDeletingContent?: boolean`. Forward as `allow_deleting_content`. Default is `true` when no range is given (current behavior), default is `false` when a range is given (safer for partial edits).
- All existing behavior (empty page fallback, full-page range building) must be preserved when new options are absent.

MUST NOT:
- Change the function signatures in a way that breaks existing callers (`append.ts` and `edit-page.ts` call these with no options object today — that must still compile and work).
- Remove `buildContentRange()` — it is still used when no range is provided.
- Swallow errors from the SDK; let them propagate to the error handler.
</requirements>

<acceptance_criteria>
- [ ] Test: `appendMarkdown` called without `after` — SDK called with no `after` field (existing behavior)
- [ ] Test: `appendMarkdown` called with `after: "foo...bar"` — SDK called with `insert_content.after` set to `"foo...bar"`
- [ ] Test: `replaceMarkdown` called without `range` — SDK called with full-page `content_range` (existing behavior), `allow_deleting_content: true`
- [ ] Test: `replaceMarkdown` called with `range: "## Section...end"` — SDK called with that exact `content_range`, `allow_deleting_content: false`
- [ ] Test: `replaceMarkdown` called with `range` AND `allowDeletingContent: true` — SDK called with `allow_deleting_content: true`
- [ ] Test: `replaceMarkdown` on empty page with no options — falls back to `insert_content` (existing behavior)
- [ ] Test: `replaceMarkdown` on empty page with `range` provided — still falls back to `insert_content` (range is irrelevant when page is empty)
- [ ] No regressions in existing tests
</acceptance_criteria>

<constraints>
MAY:
- Define `AppendOptions` and `ReplaceOptions` interfaces inline or exported as needed
- Keep `buildContentRange()` private

MUST NOT:
- Export `buildContentRange` (it's an implementation detail)
- Add a `range` parameter as a positional argument — use an options object
</constraints>

<context>
- File to edit: `src/services/write.service.ts`
- Existing callers: `src/commands/append.ts:53`, `src/commands/edit-page.ts:60`
- SDK type reference: `client.pages.updateMarkdown({ page_id, type: 'insert_content', insert_content: { content, after? } })`
- SDK type reference: `client.pages.updateMarkdown({ page_id, type: 'replace_content_range', replace_content_range: { content, content_range, allow_deleting_content? } })`
- Existing tests directory: `tests/` (mirror structure under `tests/services/` for new tests)
</context>

<verification>
Unit tests pass. Existing callers compile without changes. Manual smoke test deferred to integration task.
</verification>
