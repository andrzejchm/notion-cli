# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Working `notion` CLI binary that authenticates with Notion, manages multi-workspace config with named profiles, parses Notion URLs, and provides the infrastructure all future commands build on.

</domain>

<decisions>
## Implementation Decisions

### Init flow & token setup
- Multi-token support with named profiles (similar to gcloud CLI configurations)
- `notion init` creates/updates a profile — prompts for profile name and integration token
- Token validated against Notion API (`GET /users/me`) before saving
- If a token already exists for the profile, show current status and offer to replace
- Global named profiles + directory-level override via `.notion.yaml`
- `.notion.yaml` in project root can specify either `profile: <name>` (looks up global config) or `token: <value>` (direct token, useful for CI)

### CLI command style & help
- Binary name is `notion` (no `ntn` alias)
- Grouped subcommands — related commands nest under a group (e.g., `notion db schema`, `notion db query`)
- Help output grouped by category (Auth, Read, Database, etc.) with short descriptions, like `gh --help`
- Shell completions from day one — `notion completion bash/zsh/fish` generates completion scripts

### Error messages & output
- Structured errors with error codes: `[AUTH_INVALID] Invalid token.\n  → Run "notion init" to reconfigure`
- Color only when TTY detected — no color when piped. `--color` flag to force color on.
- `--verbose` flag shows API requests/responses for debugging
- No spinners or progress indicators — just wait and show results

### Config & environment behavior
- Global config at `~/.config/notion-cli/config.yaml` (XDG default), YAML format consistent with `.notion.yaml`
- Token precedence: `NOTION_API_TOKEN` env var > `.notion.yaml` (local) > active profile (global)
- Always show token source on stderr: `Using token from NOTION_API_TOKEN` (or `from .notion.yaml` or `from profile: work`)
- Full profile management: `notion profile list`, `notion profile use <name>`, `notion profile remove <name>`

### Claude's Discretion
- Exact error code naming scheme
- YAML parsing library choice
- Config file migration strategy if format changes
- Internal project structure and module organization

</decisions>

<specifics>
## Specific Ideas

- Profile system modeled after `gcloud config configurations` — named profiles with activate/switch semantics
- `.notion.yaml` is deliberately simple: either `profile: work` or `token: ntn_xxxxx`, not both
- Should work cleanly in CI pipelines — env var override + no interactive prompts when not TTY

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-02-26*
