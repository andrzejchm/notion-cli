# Notion CLI — Agent Skill Reference

> **Audience:** AI coding agents (Claude Code, OpenCode, Codex) and developers.
> Use this reference to query Notion pages and databases directly from the terminal or within automated workflows.

The `notion` CLI provides read access to Notion workspaces via the official API. Agents can fetch page content as markdown, query structured databases as JSON, and discover workspace resources — all without leaving the shell.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Agent Setup by Platform](#agent-setup-by-platform)
3. [Output Modes](#output-modes)
4. [Command Reference](#command-reference)
   - [Authentication](#authentication)
   - [Search & Discovery](#search--discovery)
   - [Page Reading](#page-reading)
   - [Database Operations](#database-operations)
5. [Common Agent Patterns](#common-agent-patterns)
6. [ID and URL Formats](#id-and-url-formats)
7. [Troubleshooting](#troubleshooting)

---

## Installation & Setup

```bash
npm install -g @andrzejchm/notion-cli
notion init   # interactive setup — enter your Notion integration token
```

**Alternative: environment variable (preferred for CI and agent environments)**

```bash
export NOTION_API_TOKEN=ntn_your_token_here
```

Get your token at: https://www.notion.so/profile/integrations/internal

> **Integration access:** Each page or database your agent needs must be explicitly shared with your integration.
> In Notion: open the page → `⋯` menu → **Add connections** → select your integration.

---

## Agent Setup by Platform

### Claude Code

Add to `CLAUDE.md`:

```markdown
## Notion Access

Use `notion` CLI to access Notion pages and databases.

- Auth: ensure `NOTION_API_TOKEN` is set, or run `notion init` once.
- Page content: `notion read <id>` outputs markdown.
- Structured data: `notion db query <id> --json | jq '.[] | .properties'`
- See `docs/agent-skill.md` for full command reference and patterns.
```

### OpenCode

Add to `.opencode/config.json`:

```json
{
  "tools": ["bash"],
  "instructions": "notion CLI is available for Notion access. See docs/agent-skill.md for full usage."
}
```

Ensure `NOTION_API_TOKEN` is set in your shell environment before starting OpenCode.

### Codex / Generic Agents

Add to system prompt or `AGENTS.md`:

```markdown
Available tool: `notion` CLI (npm install -g @andrzejchm/notion-cli)
Auth: set NOTION_API_TOKEN env var, or run `notion init` interactively.
See docs/agent-skill.md for commands, flags, and agent patterns.
```

---

## Output Modes

The CLI outputs plain text tables by default — in terminal and when piped.

| Context           | Default Output              | Override flag      |
|-------------------|-----------------------------|--------------------|
| Terminal (TTY)    | Formatted tables, colored   | `--json` for JSON  |
| Piped / agent     | Plain text tables           | `--json` for JSON  |

**For agents: add `--json` to get machine-readable output:**

```bash
notion search "my query" --json | jq '.[]'
notion ls --json | jq '.[] | {id, title}'
notion db query "$DB_ID" --json | jq '.[] | .properties.Status'
```

**For page content: markdown is always the default in both modes:**

```bash
notion read "$PAGE_ID"          # markdown output (works in terminal AND piped)
notion read "$PAGE_ID" --json   # raw JSON block tree
```

**Global flags** (apply to all commands):

| Flag     | Effect          |
|----------|-----------------|
| `--json` | Force JSON output |

---

## Command Reference

### Authentication

#### `notion init`

Interactive setup wizard. Prompts for a profile name and integration token, validates the token against the Notion API, and saves the profile.

```bash
notion init
```

- Must be run in a TTY (terminal). Use `NOTION_API_TOKEN` env var in non-interactive environments.
- On success: saves profile to `~/.notion.yaml` and sets it as active.

---

#### `notion profile list`

Lists all saved auth profiles with the active profile marked.

```bash
notion profile list
```

```bash
notion profile list --json
# [{"name":"default","workspace":"My Workspace","active":true}, ...]
```

---

#### `notion profile use <name>`

Switches the active profile.

```bash
notion profile use work
```

---

#### `notion profile remove <name>`

Removes a saved profile. If the removed profile was active, no profile is set as active.

```bash
notion profile remove old-profile
```

---

### Search & Discovery

#### `notion search <query>`

Searches workspace titles (not full-text content). Returns pages and databases accessible to your integration.

```bash
notion search "Meeting Notes"
notion search "project docs" --type page
notion search "tracker" --type database
```

**Flags:**

| Flag              | Description                              |
|-------------------|------------------------------------------|
| `--type page`     | Return only pages                        |
| `--type database` | Return only databases                    |
| `--json`          | Force JSON output                        |

**Agent usage:**

```bash
notion search "Weekly Review" --type page | jq '.[0].id'
notion search "Tasks" --type database --json | jq '.[0].id'
```

**JSON output shape:**

```json
[
  {
    "id": "abc123def456789012345678901234ab",
    "title": "Weekly Review",
    "type": "page",
    "url": "https://www.notion.so/myworkspace/Weekly-Review-abc123"
  }
]
```

---

#### `notion ls`

Lists all top-level pages and databases shared with your integration.

```bash
notion ls
notion ls --json
```

**Agent usage:**

```bash
notion ls | jq '.[] | select(.type == "database") | {id, title}'
```

---

#### `notion open <id/url>`

Opens a Notion page or database in the default browser. Prints the URL to stdout for scriptable use.

```bash
notion open abc123def456789012345678901234ab
notion open "https://www.notion.so/myworkspace/My-Page-abc123"
```

---

#### `notion users`

Lists all members of the workspace.

```bash
notion users
notion users --json
```

**JSON output shape:**

```json
[
  {
    "id": "user-uuid",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "type": "person"
  }
]
```

---

#### `notion comments <id/url>`

Lists all comments on a page.

```bash
notion comments abc123def456789012345678901234ab
notion comments "https://www.notion.so/myworkspace/My-Page-abc123" --json
```

**JSON output shape:**

```json
[
  {
    "id": "comment-uuid",
    "author": "Alice Smith",
    "text": "This looks good!",
    "created": "2026-01-15T10:00:00Z"
  }
]
```

---

### Page Reading

#### `notion read <id/url>`

Fetches a Notion page and outputs its content as markdown. This is the primary command for reading page content.

```bash
notion read abc123def456789012345678901234ab
notion read "https://www.notion.so/myworkspace/My-Page-abc123def456"
notion read abc123def456789012345678901234ab --json   # raw JSON block tree
```

**Flags:**

| Flag     | Description                      |
|----------|----------------------------------|
| `--json` | Output raw Notion JSON block tree |

**Notes:**
- Default output is always markdown (even when piped).
- Accepts 32-char hex IDs, UUID format, or full Notion URLs.
- The page must be shared with your integration.

**Agent usage:**

```bash
# Read and search for a section
notion read "$PAGE_ID" | grep -A 10 "## Action Items"

# Extract all headings
notion read "$PAGE_ID" | grep "^#"

# Pass to LLM for summarization
notion read "$PAGE_ID" | your-summarize-command
```

---

### Database Operations

#### `notion db schema <id/url>`

Retrieves the schema (property names and types) of a Notion database. **Always run this before building filters** to see available properties and valid select/status values.

```bash
notion db schema abc123def456789012345678901234ab
notion db schema "$DB_ID" --json
```

**JSON output shape:**

```json
{
  "id": "abc123def456789012345678901234ab",
  "title": "Project Tracker",
  "properties": {
    "Name": { "type": "title" },
    "Status": {
      "type": "select",
      "options": ["Not started", "In Progress", "Done"]
    },
    "Assignee": { "type": "people" },
    "Due Date": { "type": "date" }
  }
}
```

---

#### `notion db query <id/url>`

Queries a Notion database with optional filters, sorting, and column selection.

```bash
notion db query abc123def456789012345678901234ab
notion db query "$DB_ID" --filter "Status=Done"
notion db query "$DB_ID" --filter "Priority=High" --filter "Status=In Progress"
notion db query "$DB_ID" --sort "Name:asc"
notion db query "$DB_ID" --sort "Created:desc"
notion db query "$DB_ID" --columns "Title,Status,Assignee"
notion db query "$DB_ID" --json
```

**Flags:**

| Flag                   | Description                                                    |
|------------------------|----------------------------------------------------------------|
| `--filter "Prop=Val"`  | Filter rows where property equals value. Repeatable.           |
| `--sort "Prop:dir"`    | Sort by property. Direction: `asc` or `desc`. Repeatable.      |
| `--columns "A,B,C"`    | Limit output to specific columns (comma-separated).            |
| `--json`               | Force JSON output.                                             |

**Agent usage:**

```bash
# Get all done items as JSON
notion db query "$DB_ID" --filter "Status=Done" --json | jq '.[] | .properties'

# Extract title and status for each row
notion db query "$DB_ID" --json | jq '.[] | {id, title: .properties.Name, status: .properties.Status}'

# Get most recently modified items
notion db query "$DB_ID" --sort "Last edited:desc" --columns "Title,Status" | head -20
```

**JSON output shape:**

```json
[
  {
    "id": "row-uuid",
    "properties": {
      "Name": "Project Alpha",
      "Status": "In Progress",
      "Assignee": "Alice Smith",
      "Due Date": "2026-03-01"
    }
  }
]
```

---

## Common Agent Patterns

```bash
# Pattern 1: Find a page by title, then read it
PAGE_ID=$(notion search "Meeting Notes" --type page | jq -r '.[0].id')
notion read "$PAGE_ID"

# Pattern 2: Get all items with a specific status from a database
DB_ID=$(notion search "Project Tracker" --type database | jq -r '.[0].id')
notion db query "$DB_ID" --filter "Status=Done" | jq '.[] | .properties'

# Pattern 3: List recent entries sorted by date
notion db query "$DB_ID" --sort "Last edited:desc" --columns "Title,Status" | head -20

# Pattern 4: Read a page and extract specific content
notion read "$PAGE_ID" | grep -A 5 "## Action Items"

# Pattern 5: Check database schema before building a filter
notion db schema "$DB_ID"   # see what properties exist and their valid values
notion db query "$DB_ID" --filter "Status=In Progress"

# Pattern 6: Using URLs instead of IDs
notion read "https://www.notion.so/myworkspace/My-Page-abc123def456"
notion db query "https://www.notion.so/myworkspace/My-DB-abc123def456"

# Pattern 7: Combine search + query in one pipeline
notion search "Tasks" --type database | jq -r '.[0].id' | xargs -I{} notion db query {} --filter "Assignee=Alice" --json
```

---

## ID and URL Formats

The CLI accepts any of these formats for the `<id>` argument in all commands:

| Format       | Example                                              |
|--------------|------------------------------------------------------|
| 32-char hex  | `abc123def456789012345678901234ab`                   |
| UUID         | `abc123de-f456-7890-1234-5678901234ab`               |
| Full URL     | `https://www.notion.so/workspace/Page-Title-abc123`  |

All commands (`read`, `db query`, `db schema`, `open`, `comments`) accept any of these formats.

---

## Troubleshooting

**Page not found (404):** The page must be shared with your integration.
In Notion: open the page → `⋯` menu → **Add connections** → select your integration.

**Unauthorized (401):** Your token is invalid or expired.
Run `notion init` to reconfigure, or set a new `NOTION_API_TOKEN`.
Get a new token at: https://www.notion.so/profile/integrations/internal

**Search returns no results:** Search is title-only (not full-text content search).
The page or database must also be explicitly shared with your integration.

**Empty database query:** No entries match your filters, or the database has no entries.
Run `notion db schema <id>` first to see available properties and their valid values.

**`notion init` fails in agent/CI environment:** `notion init` requires an interactive terminal (TTY).
Use the `NOTION_API_TOKEN` environment variable instead.
