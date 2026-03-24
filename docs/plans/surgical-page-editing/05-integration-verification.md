# Task 5: Integration Verification

<objective>
Verify all components from previous tasks integrate correctly and the surgical editing feature works end-to-end. Resolve all deferred work items tracked during execution.
</objective>

<requirements>
MUST:
- Resolve all deferred work items (DW-* entries in PROGRESS.md if any).
- Build the project (`npm run build`) and confirm zero errors.
- Run the full test suite and confirm no regressions.
- Verify `notion append --help` and `notion edit-page --help` show the new flags.
- Smoke test the happy path on a real Notion page (or mock test if integration credentials are unavailable).
- Confirm that omitting the new flags produces behavior identical to the pre-feature baseline.

MUST NOT:
- Leave any DW-* items unresolved.
- Introduce new functionality (this task is wiring + verification only).
</requirements>

<integration_points>
- `src/commands/append.ts` → calls `appendMarkdown(client, uuid, markdown, { after })` (Task 1 + 2)
- `src/commands/edit-page.ts` → calls `replaceMarkdown(client, uuid, markdown, { range, allowDeletingContent })` (Task 1 + 3)
- SDK error `validation_error` → caught in command layer → `CliError` with selector hint (Tasks 2 + 3)
- `docs/skills/using-notion-cli/SKILL.md` → reflects new flags (Task 4)
</integration_points>

<acceptance_criteria>
- [ ] All DW-* items in PROGRESS.md are resolved
- [ ] `npm run build` exits 0
- [ ] All existing tests pass
- [ ] New unit tests from Tasks 1–3 pass
- [ ] `notion append --help` shows `--after` option
- [ ] `notion edit-page --help` shows `--range` and `--allow-deleting-content` options
- [ ] Calling `notion append <id> -m "text"` (no `--after`) behaves exactly as before
- [ ] Calling `notion edit-page <id> -m "text"` (no `--range`) behaves exactly as before
- [ ] No orphaned mocks/stubs in production code
</acceptance_criteria>

<constraints>
MAY:
- Refactor wiring code for clarity
- Add missing imports/registrations

MUST NOT:
- Add new features or change component behavior
- Skip any DW-* item without explicit user approval
</constraints>

<verification>
Manual end-to-end verification:
1. Run `notion append --help` — confirm `--after <selector>` is listed
2. Run `notion edit-page --help` — confirm `--range <selector>` and `--allow-deleting-content` are listed
3. Run `notion append <real-page-id> -m "text"` — confirm "Appended." and content appears at end (no regression)
4. Run `notion edit-page <real-page-id> -m "full page"` — confirm full page replaced (no regression)
5. Run `notion edit-page <real-page-id> --range "## Target Section...last line" -m "## Target Section\n\nUpdated."` — confirm only the targeted section changed
6. Run `notion append <real-page-id> --after "## Intro...paragraph" -m "## New Section\n\nInserted."` — confirm content inserted after the matched section
7. Run with a non-existent selector — confirm error message explains ellipsis format

Automated tests:
- [ ] Unit tests: `appendMarkdown` and `replaceMarkdown` with and without new options
- [ ] Command-layer tests: `--after` and `--range` flags parsed and forwarded correctly
</verification>
