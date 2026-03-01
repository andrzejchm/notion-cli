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
