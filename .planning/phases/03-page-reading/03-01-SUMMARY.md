# Plan 03-01 Summary: Rich Text Converter

## What Was Built
- `src/blocks/rich-text.ts`: `richTextToMd()` function that converts Notion rich text segment arrays into markdown strings
- `tests/blocks/rich-text.test.ts`: comprehensive test suite with 15 tests covering all segment types and annotation combinations

## Key Implementation Details

### `richTextToMd(richText: RichTextItemResponse[]): string`
Maps each segment through `segmentToMd` and joins results with no separator.

### Segment handling by type:
- **`equation`**: wraps `equation.expression` in `$...$`
- **`mention`**: uses `plain_text`; wraps in `[text](href)` if `href` is non-null
- **`text`**: applies annotation markers to `text.content`, then wraps in `[text](url)` if `text.link` is non-null

### Annotation application order (inner-to-outer):
1. `code` → `` `x` ``
2. `strikethrough` → `~~x~~`
3. `italic` → `_x_`
4. `bold` → `**x**`

### Annotations with no markdown equivalent:
- `underline` — outputs plain text (no `<u>` tags)
- `color` (non-default) — outputs plain text

### Helper extracted:
- `applyAnnotations(text, annotations)` — applies all annotation wrappers in correct order

## Commits
- `2cea314` — `test(03-01): add failing rich text tests` (RED phase)
- `2a5bdc1` — `feat(03-01): implement richTextToMd` (GREEN phase)

No REFACTOR commit — code was already clean after GREEN phase.

## Deferred Work
None.
