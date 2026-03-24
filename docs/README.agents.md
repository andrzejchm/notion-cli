# notion-cli for OpenCode

Complete guide for using notion-cli with [OpenCode](https://opencode.ai).

## Quick Install

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/andrzejchm/notion-cli/main/docs/README.agents.md
```

## Installation

### 1. Install the CLI

```bash
# Homebrew (recommended)
brew update && brew tap andrzejchm/notion-cli && brew install notion-cli

# npm (alternative)
npm install -g @andrzejchm/notion-cli
```

Homebrew bundles Node.js automatically. npm requires Node.js ≥ 22.

### 2. Install the skill file

```bash
mkdir -p ~/.config/opencode/skills/using-notion-cli
curl -fsSL https://raw.githubusercontent.com/andrzejchm/notion-cli/main/docs/skills/using-notion-cli/SKILL.md \
  -o ~/.config/opencode/skills/using-notion-cli/SKILL.md
```

### 3. Authenticate

**Interactive setup** (choose OAuth or integration token):
```bash
notion auth login
```

**Integration token only** (CI/agents — no TTY needed):
```bash
export NOTION_API_TOKEN=ntn_your_token_here
```

Get a token: https://www.notion.so/profile/integrations/internal

**OAuth** (recommended for write operations — attributes comments/pages to your user):
```bash
notion auth login          # select "OAuth user login" in the prompt
notion auth login --manual # headless: prints URL, paste redirect back
```

### 4. Share pages with your integration

Open any Notion page → `⋯` → **Add connections** → select your integration.

### 5. Verify

```bash
notion --version   # CLI installed
notion ls          # auth works
```

Restart OpenCode after installing. The skill is now discoverable via the `skill` tool.

## Updating

```bash
# Homebrew
brew upgrade notion-cli

# npm
npm install -g @andrzejchm/notion-cli

# Update skill file (either install method)
curl -fsSL https://raw.githubusercontent.com/andrzejchm/notion-cli/main/docs/skills/using-notion-cli/SKILL.md \
  -o ~/.config/opencode/skills/using-notion-cli/SKILL.md
```

## Commands Reference

### `notion search <query>` / `notion ls`

Search or list pages and databases. Both commands support:

```bash
# Sort results by last edited time
notion search "meeting notes" --sort desc
notion ls --sort asc

# Filter by type
notion search "Q1" --type page
notion ls --type database
```

| Flag | Description |
|------|-------------|
| `--sort <asc\|desc>` | Sort by last edited time |
| `--type <page\|database>` | Filter by object type |
| `--cursor <cursor>` | Pagination cursor from a previous `--next` hint |
| `--json` | Force JSON output |

### `notion update <id|url>`

Update properties on any Notion page (standalone or database entry).

```bash
# Set a select property
notion update "$PAGE_ID" --prop "Status=Done"

# Set multiple properties at once
notion update "$PAGE_ID" --prop "Status=In Progress" --prop "Priority=High"

# Update the page title
notion update "$PAGE_ID" --title "New Page Title"

# Combine --title and --prop
notion update "$PAGE_ID" --title "Updated" --prop "Status=Done"

# Clear a property (set to empty)
notion update "$PAGE_ID" --prop "Status="

# Output the updated page as JSON
notion update "$PAGE_ID" --prop "Status=Done" --json
```

**Supported property types:** `title`, `rich_text`, `select`, `status`, `multi_select`, `number`, `checkbox`, `url`, `email`, `phone_number`, `date`

**`--prop` format details:**

| Type | Example |
|------|---------|
| `title` / `rich_text` | `--prop "Name=My Title"` |
| `select` / `status` | `--prop "Status=Done"` |
| `multi_select` | `--prop "Tags=design,eng,qa"` |
| `number` | `--prop "Count=42"` |
| `checkbox` | `--prop "Done=true"` or `--prop "Done=yes"` |
| `url` | `--prop "Link=https://example.com"` |
| `date` | `--prop "Due=2024-12-25"` or `--prop "Range=2024-01-01,2024-01-31"` |

Required integration capabilities: **Read content**, **Update content**

### `notion archive <id|url>`

Archive (trash) a Notion page.

```bash
# Archive a page by ID
notion archive "$PAGE_ID"

# Archive a page by URL
notion archive "https://www.notion.so/My-Page-b55c9c91384d452b81dbd1ef79372b75"

# Output the full updated page object as JSON
notion archive "$PAGE_ID" --json
```

Required integration capabilities: **Read content**, **Update content**

### `notion comment [id|url] -m <text>`

Add a comment to a page, block, or discussion thread.

```bash
# Page-level comment
notion comment "$PAGE_ID" -m "Reviewed and approved."

# Reply to an existing discussion thread (use discussion ID from `notion comments`)
notion comment --reply-to "$DISCUSSION_ID" -m "Agreed, let's proceed."

# Comment on a specific block
notion comment --block "$BLOCK_ID" -m "This section needs revision."
```

| Flag | Description |
|------|-------------|
| `-m, --message <text>` | Comment text (required) |
| `--reply-to <discussion-id>` | Reply to an existing discussion thread |
| `--block <block-id>` | Comment on a specific block |

The `notion comments <id>` list command now shows `DISCUSSION` and `PARENT` columns so agents can reference discussion IDs with `--reply-to`.

Required integration capabilities: **Read content**, **Insert content**, **Read comments**, **Insert comments**
