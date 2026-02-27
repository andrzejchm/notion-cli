# Plan 03-03 Summary: Block Converter Registry

## What Was Built
- `src/blocks/converters.ts`: `blockToMd()` registry with 14 P1 block types
- `tests/blocks/converters.test.ts`: comprehensive test suite with 27 test cases

## Key Implementation Details

- **Registry pattern**: `converters` is a `Record<string, BlockConverter>` where each entry is a focused, side-effect-free function. Fallback at the end of `blockToMd()` handles unknown types with an HTML comment.
- **Type narrowing**: Each converter casts the block to its specific discriminated union member via `Extract<BlockObjectResponse, { type: '...' }>` for full type safety.
- **Children indentation**: `indentChildren()` helper splits on `\n`, filters empty lines, prepends `  ` to each line, and rejoins — used by `bulleted_list_item`.
- **Toggle children**: Appended directly (no indentation) after the bold header line.
- **Code language**: `'plain text'` maps to an empty fence language string.
- **Callout icon**: Only `emoji` type produces a prefix; `external` icon type is silently skipped.
- **Image expiry**: Notion-hosted (`type: 'file'`) images append `<!-- expires: ... -->` comment; external images do not.
- **Bookmark caption**: Falls back to the URL itself when caption is empty.
- **No refactoring needed**: Code was clean from the start — KISS principle applied throughout.

## Commits
- `3c5302e` — `test(03-03): add failing block converter tests` (RED phase)
- `0a1f12d` — `feat(03-03): implement blockToMd converter registry` (GREEN phase)

## Deferred Work
None.
