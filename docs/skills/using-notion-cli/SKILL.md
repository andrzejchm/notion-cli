---
name: using-notion-cli
description: Reads and writes Notion pages using the `notion` CLI tool. Use when accessing Notion content, searching workspace pages, querying database entries, reading page markdown, appending content, creating pages, or adding comments from the terminal or within automated workflows.
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

**Integration capabilities** (set at notion.so/profile/integrations/internal → your integration → Capabilities):
- Read-only commands: **Read content** only
- `notion append`, `notion create-page`: also need **Insert content**
- `notion comment`: also need **Read comments** + **Insert comments**

---

## Output Modes

| Context | Default | Override |
|---------|---------|----------|
| Terminal (TTY) | Formatted tables | `--json` |
| Piped / agent | Plain text tables | `--json` |

`notion read` always outputs **markdown** — in terminal and when piped.

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

### Write Operations

```bash
notion append <id|url> -m "## Heading\nParagraph text"   # append markdown blocks to a page
notion append <id|url> -m "$(cat notes.md)"              # append file contents

notion create-page --parent <id|url> --title "Title"               # title-only page
notion create-page --parent <id|url> --title "Title" -m "# Hello"  # with markdown body
echo "# Content" | notion create-page --parent <id|url> --title "Title"  # from stdin
URL=$(notion create-page --parent <id|url> --title "Summary" -m "...")   # capture URL

notion comment <id|url> -m "Reviewed and approved."      # add comment to a page
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

# Summarize a page and append the summary back
SUMMARY=$(notion read "$PAGE_ID" | your-summarize-command)
notion append "$PAGE_ID" -m "## AI Summary\n$SUMMARY"

# Create a page and capture its URL for further use
URL=$(notion create-page --parent "$PAGE_ID" --title "Report $(date +%Y-%m-%d)" -m "# Report\n...")
echo "Created: $URL"

# Pipe command output into a new page
my-report-command | notion create-page --parent "$PAGE_ID" --title "Auto Report"
```

---

## Troubleshooting

**404 / page not found** — Share the page with your integration: page → `⋯` → **Add connections**.

**401 / unauthorized** — Run `notion init` or set `NOTION_API_TOKEN`.

**Search returns nothing** — Search is title-only. Page must be shared with integration.

**Empty db query** — Run `notion db schema <id>` to see valid property names and values.

**`notion init` fails in agent** — Requires TTY. Use `NOTION_API_TOKEN` env var instead.

**`notion comment` returns "Insufficient permissions"** — Enable **Read comments** + **Insert comments** in integration capabilities: notion.so/profile/integrations/internal → your integration → Capabilities.

**`notion append` / `notion create-page` returns "Insufficient permissions"** — Enable **Insert content** in integration capabilities.
