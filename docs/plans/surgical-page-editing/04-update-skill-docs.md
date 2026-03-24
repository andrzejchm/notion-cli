# Task 4: Update Skill Documentation

<objective>
Update `docs/skills/using-notion-cli/SKILL.md` to document the new `--after` flag on `append` and the `--range` / `--allow-deleting-content` flags on `edit-page`, including the ellipsis selector format and agent usage patterns.
</objective>

<requirements>
MUST:
- Add `--after <selector>` to the `append` examples in the **Write Operations** section.
- Add `notion edit-page` examples to the **Write Operations** section (it was missing entirely before this feature).
- Explain the ellipsis selector format (`"start text...end text"`) in a short note — either inline or as a brief sub-section under Write Operations.
- Add at least one agent pattern example showing how to surgically update a specific section (e.g. read page, identify selector, replace section).
- Update the integration capabilities table to include **Update content** capability requirement for `edit-page` and `append --after`.

MUST NOT:
- Remove any existing examples or documentation.
- Change any existing command syntax — only add new content.
</requirements>

<acceptance_criteria>
- [ ] `append --after` is documented with an example
- [ ] `edit-page --range` is documented with an example
- [ ] Ellipsis selector format is explained with at least one example
- [ ] Agent pattern showing surgical section update is present
- [ ] Integration capabilities table is updated
- [ ] File renders correctly as markdown
</acceptance_criteria>

<constraints>
MAY:
- Add a dedicated "Surgical Editing" or "Section Editing" sub-section under Write Operations
- Use a tip/note callout format (blockquote) for the selector format explanation

MUST NOT:
- Rewrite the entire SKILL.md — scope is additive only
</constraints>

<context>
- File to edit: `docs/skills/using-notion-cli/SKILL.md`
- Write Operations section starts at line 105
- Agent Patterns section starts at line 130
- Integration capabilities table starts at line 25
</context>

<verification>
Read the file after changes and confirm all new flags are documented clearly.
</verification>
