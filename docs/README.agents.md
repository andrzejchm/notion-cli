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

---

## Editing Gotchas

### Table selector gotcha

Tables written as markdown (`| Col | Col |`) are returned by Notion as `<table>` HTML. When building `--range` selectors for table content, use the HTML form from `read` output, not the markdown form you wrote.

```bash
# Read the page to see actual format
notion read $PAGE_ID
# Selector must match the returned format:
notion edit-page $PAGE_ID --range "## Data...</table>" -m "## Data\n\n| Name | Score |\n|------|-------|\n| Alice | 100 |"
```

### Code block selector gotcha

Triple backticks (`` ``` ``) appear twice in every code block (opening + closing). A selector like `` ```python...``` `` will match multiple occurrences. Include content from inside the code block to disambiguate:

```bash
# BAD: matches 2+ occurrences
notion edit-page $PAGE_ID --range '```python...```' -m '...'
# GOOD: include unique content inside the block
notion edit-page $PAGE_ID --range '```python\ndef hello...print("world")\n```' -m '...'
```

### Deleting a section

Use empty `-m ""` with `--range` and `--allow-deleting-content`:

```bash
notion edit-page $PAGE_ID --range "## Old Section...end of old section" -m "" --allow-deleting-content
```
