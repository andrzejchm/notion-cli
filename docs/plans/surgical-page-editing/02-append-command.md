# Task 2: Expose `--after` on `append` Command

<objective>
Add an optional `--after <selector>` flag to `notion append` that lets users insert content after a specific section instead of always at the end of the page.
</objective>

<requirements>
MUST:
- Add `--after <selector>` option to the `append` command. Type: string, optional.
- When `--after` is provided, pass it as the `after` option to `appendMarkdown()`.
- When `--after` is omitted, behavior must be identical to current (append to end).
- The selector format must be mentioned in the option description: `ellipsis selector, e.g. "## My Section...last line of section"`.
- If the API returns a `validation_error` (selector not found in page), surface it as a `CliError` with a helpful suggestion: explain the ellipsis format and suggest running `notion read <id>` to see the page content for building the selector.

MUST NOT:
- Require `--after` — it must remain optional.
- Change the `-m`/`--message` or stdin behavior.
</requirements>

<acceptance_criteria>
- [ ] `notion append <id> -m "text"` — works exactly as before (no regression)
- [ ] `notion append <id> -m "text" --after "## Section...end"` — calls `appendMarkdown` with `after` set
- [ ] Validation error from SDK is caught and re-thrown as `CliError` with selector format hint
- [ ] `notion append --help` shows `--after` option with description
- [ ] TypeScript compiles cleanly
</acceptance_criteria>

<constraints>
MAY:
- Reuse the `readStdin()` helper already in the file or extract to a shared utility
- Wrap the SDK error detection in `withErrorHandling` (already wraps the action)

MUST NOT:
- Extract `readStdin` to a shared file in this task (deferred to a potential future refactor task)
- Change `appendMarkdown`'s behavior — only pass through new args
</constraints>

<context>
- File to edit: `src/commands/append.ts`
- Updated service: `src/services/write.service.ts` (from Task 1)
- Pattern for error wrapping: `src/errors/error-handler.ts` and `src/errors/cli-error.ts`
- Commander option pattern: see other commands in `src/commands/`
</context>

<verification>
```
notion append <page-id> -m "## New Section\n\nHello" --after "## Existing Section...end of it"
# Expected: "Appended." success message, content inserted in the right place
notion append <page-id> -m "text" --after "## NonExistent...section"
# Expected: error message with selector format hint
```
</verification>
