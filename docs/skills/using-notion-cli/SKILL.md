---
name: using-notion-cli
description: Reads Notion pages and queries databases using the `notion` CLI tool. Use when accessing Notion content, searching workspace pages, querying database entries, or reading page markdown from the terminal or within automated workflows.
license: MIT
compatibility: opencode
---

## Setup

Install once:
```bash
npm install -g @andrzejchm/notion-cli
notion init   # enter your Notion integration token
```

Or set env var (preferred for CI/agents):
```bash
export NOTION_API_TOKEN=ntn_your_token_here
```

Get token: https://www.notion.so/profile/integrations/internal

Pages must be shared with your integration: open page → `⋯` → **Add connections**.

---

## Output Modes

| Context | Default | Override |
|---------|---------|----------|
| Terminal (TTY) | Formatted tables | `--json` |
| Piped / agent | JSON | `--md` |

`notion read` always outputs **markdown** regardless of context.

Pipe any command to get JSON:
```bash
notion search "query" | jq '.[0].id'
notion ls | jq '.[] | select(.type == "database")'
```

---

## Commands

### Search & Discovery

```bash
notion search "query"                    # search all pages/databases by title
notion search "query" --type page        # pages only
notion search "query" --type database    # databases only
notion ls                                # list everything accessible to integration
notion users                             # list workspace members
notion comments <id|url>                 # list page comments
notion open <id|url>                     # open in browser
```

### Reading Pages

```bash
notion read <id|url>          # markdown (always, even when piped)
notion read <id|url> --json   # raw Notion JSON block tree
```

### Database Operations

```bash
notion db schema <id|url>                             # inspect properties + valid values
notion db query <id|url>                              # all rows
notion db query <id|url> --filter "Status=Done"       # filter (repeatable)
notion db query <id|url> --sort "Created:desc"        # sort (repeatable)
notion db query <id|url> --columns "Title,Status"     # limit columns
notion db query <id|url> --json | jq '.[] | .properties'
```

### Auth

```bash
notion init                   # interactive setup (requires TTY)
notion profile list           # show saved profiles
notion profile use <name>     # switch active profile
notion profile remove <name>  # delete a profile
```

---

## ID Formats

All commands accept any of:
- `abc123def456789012345678901234ab` (32-char hex)
- `abc123de-f456-7890-1234-5678901234ab` (UUID)
- `https://www.notion.so/workspace/Page-Title-abc123` (full URL)

---

## Agent Patterns

```bash
# Find page by title, read it
PAGE_ID=$(notion search "Meeting Notes" --type page | jq -r '.[0].id')
notion read "$PAGE_ID"

# Get database ID, then query with filter
DB_ID=$(notion search "Project Tracker" --type database | jq -r '.[0].id')
notion db query "$DB_ID" --filter "Status=In Progress" | jq '.[] | .properties'

# Always check schema before filtering (see valid property names/values)
notion db schema "$DB_ID"
notion db query "$DB_ID" --filter "Status=Done"

# Extract page section
notion read "$PAGE_ID" | grep -A 10 "## Action Items"

# Pipe to LLM / summarizer
notion read "$PAGE_ID" | your-summarize-command
```

---

## Troubleshooting

**404 / page not found** — Share the page with your integration: page → `⋯` → **Add connections**.

**401 / unauthorized** — Run `notion init` or set `NOTION_API_TOKEN`.

**Search returns nothing** — Search is title-only. Page must be shared with integration.

**Empty db query** — Run `notion db schema <id>` to see valid property names and values.

**`notion init` fails in agent** — Requires TTY. Use `NOTION_API_TOKEN` env var instead.
