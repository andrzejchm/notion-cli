# Decisions Log

**Plan:** testing-infrastructure

---

### Decision 1 - 2026-03-14 10:10
**Task:** Pre-execution validation
**Context:** Plan references `NOTION_TOKEN` as the CLI's env var in multiple places (Task 2 context, Task 3 context)
**Decision:** The CLI actually uses `NOTION_API_TOKEN` (see src/config/token.ts line 91). All implementation will use the correct env var name.
**Rationale:** Verified by reading the source code. The plan's references to NOTION_TOKEN are incorrect.
**Source:** agent (code review during validation)
