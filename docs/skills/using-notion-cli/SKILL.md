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
notion auth login   # interactive setup — choose OAuth or integration token
```

Or set env var (preferred for CI/agents):
```bash
export NOTION_API_TOKEN=ntn_your_token_here
```

Get token: https://www.notion.so/profile/integrations/internal

Pages must be shared with your integration: open page → `⋯` → **Add connections**.

**Integration capabilities** (set at notion.so/profile/integrations/internal → your integration → Capabilities):
- Read-only commands: **Read content** only
- `notion append`, `notion append --after`, `notion create-page` (page parent): also need **Insert content**
- `notion create-page --parent <db>`: also need **Insert content** + database must be shared with integration
- `notion edit-page`: also need **Update content** + **Insert content**
- `notion comment`: also need **Read comments** + **Insert comments**

---

## Authentication

Two auth methods are available. If both are configured, **OAuth takes precedence**.

| Method | Command | Attribution | Notes |
|--------|---------|-------------|-------|
| Interactive setup | `notion auth login` | — | Guides you to choose; TTY required |
| OAuth user login | select "OAuth user login" in `notion auth login` | Your Notion account | Browser required; `--manual` for headless |
| Integration token | select "Integration token" in `notion auth login` | Integration bot | Works in CI/headless; must connect integration to pages |

```bash
notion auth login                    # interactive selector — OAuth or integration token
notion auth login --manual           # headless OAuth (prints URL, paste redirect back)
notion auth status                   # show current auth state
notion auth logout                   # remove a profile (interactive selector)
notion auth logout --profile <name>  # remove specific profile directly
notion auth list                     # list all saved profiles
notion auth use <name>               # switch active profile
```

**Headless/CI agents:** Use `NOTION_API_TOKEN=<token>` env var — overrides all config, no TTY needed.

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

notion create-page --parent <page-id|url> --title "Title"               # child page under a page
notion create-page --parent <page-id|url> --title "Title" -m "# Hello"  # with markdown body
echo "# Content" | notion create-page --parent <page-id|url> --title "Title"  # from stdin

# Create entry in a database (auto-detected from parent ID)
notion create-page --parent <db-id|url> --title "New Task"
notion create-page --parent <db-id|url> --title "Task" --prop "Status=To Do" --prop "Priority=High"
notion create-page --parent <db-id|url> --title "Task" --prop "Due=2026-04-01" -m "# Details"

# Icon and cover
notion create-page --parent <id|url> --title "Page" --icon "🚀"
notion create-page --parent <id|url> --title "Page" --cover "https://example.com/img.jpg"

URL=$(notion create-page --parent <id|url> --title "Summary" -m "...")   # capture URL

notion comment <id|url> -m "Reviewed and approved."      # add comment to a page
```

#### Updating Page Properties

```bash
notion update <id|url> --prop "Status=Done"                      # set a single property
notion update <id|url> --prop "Status=Done" --prop "Priority=1"  # multiple properties
notion update <id|url> --title "New Title"                       # set the title
notion update <id|url> --prop "Due=2026-04-01"                   # set a date
notion update <id|url> --prop "Tags=bug,urgent"                  # multi-select (comma-separated)
notion update <id|url> --prop "Done=true"                        # checkbox (true/yes/false/no)
notion update <id|url> --prop "Status="                          # clear a property (empty value)
```

Supported types: title, rich_text, select, status, multi_select, number, checkbox, url, email, phone_number, date.

#### Surgical Editing

Search-and-replace specific text, replace the full page, or insert content at a specific location.

```bash
# Search-and-replace: find text and replace it
notion edit-page <id|url> --find "old text" --replace "new text"

# Multiple search-and-replace operations in one call
notion edit-page <id|url> --find "old1" --replace "new1" --find "old2" --replace "new2"

# Replace all occurrences (not just the first match)
notion edit-page <id|url> --find "TODO" --replace "DONE" --all

# Replace an entire page's content
notion edit-page <id|url> -m "# Replacement\nNew full-page content"

# Pipe replacement content from a file
cat updated-section.md | notion edit-page <id|url>

# Allow deletion of child pages/databases during replace
notion edit-page <id|url> -m "## Clean Slate" --allow-deleting-content

# Append after a matched section (inserts new blocks right after the match)
notion append <id|url> -m "New content" --after "## Status...end of status"
```

> **`--range` (deprecated):** The `--range` flag still works for backward compatibility but uses the older `replace_content_range` API. Prefer `--find`/`--replace` for targeted edits.

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

# Surgically update specific text on a page
# 1. Read the page to find the text you want to change
notion read "$PAGE_ID"
# 2. Use --find/--replace to swap specific text
notion edit-page "$PAGE_ID" --find "Status: In Progress" --replace "Status: Done"

# Multiple replacements in one call
notion edit-page "$PAGE_ID" \
  --find "Status: In Progress" --replace "Status: Done" \
  --find "Blocked: yes" --replace "Blocked: none"

# Create a database entry with properties
DB_ID=$(notion search "Tasks" --type database | jq -r '.[0].id')
notion db schema "$DB_ID"   # check property names and valid values first
notion create-page --parent "$DB_ID" --title "Fix login bug" \
  --prop "Status=To Do" --prop "Priority=High" --prop "Due=2026-04-15"

# Insert a new sub-section after an existing section
notion append "$PAGE_ID" -m "## New Sub-section\nContent here" \
  --after "## Existing Section...last line of section"
```

---

## Troubleshooting

**404 / page not found** — Share the page with your integration: page → `⋯` → **Add connections**.

**401 / unauthorized** — Run `notion auth login` or set `NOTION_API_TOKEN`.

**Search returns nothing** — Search is title-only. Page must be shared with integration.

**Empty db query** — Run `notion db schema <id>` to see valid property names and values.

**`notion auth login` requires TTY** — Use `NOTION_API_TOKEN` env var in agents, or use `notion auth login --manual` for headless OAuth.

**`notion comment` returns "Insufficient permissions"** — Enable **Read comments** + **Insert comments** in integration capabilities: notion.so/profile/integrations/internal → your integration → Capabilities.

**`notion append` / `notion create-page` returns "Insufficient permissions"** — Enable **Insert content** in integration capabilities.

**`notion edit-page` returns "Insufficient permissions"** — Enable **Update content** in integration capabilities.

**`--find` text not found** — Run `notion read <id>` to see the exact page content. The `--find` value must match text on the page exactly.

**`--after` selector not found** — Run `notion read <id>` to see the exact page content. The selector must match real text: `"start...end"` with ~10 chars from the beginning and end of the target range.
