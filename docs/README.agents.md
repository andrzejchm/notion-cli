# notion-cli for OpenCode

Complete guide for using notion-cli with [OpenCode](https://opencode.ai).

## Quick Install

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/andrzejchm/notion-cli/main/docs/README.opencode.md
```

## Installation

### 1. Install the CLI

```bash
npm install -g @andrzejchm/notion-cli
```

Requires Node.js ≥ 22.

### 2. Install the skill file

```bash
mkdir -p ~/.config/opencode/skills/using-notion-cli
curl -fsSL https://raw.githubusercontent.com/andrzejchm/notion-cli/main/docs/skills/using-notion-cli/SKILL.md \
  -o ~/.config/opencode/skills/using-notion-cli/SKILL.md
```

### 3. Authenticate

```bash
notion init
# or: export NOTION_API_TOKEN=ntn_your_token_here
```

Get a token: https://www.notion.so/profile/integrations/internal

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
npm install -g @andrzejchm/notion-cli
curl -fsSL https://raw.githubusercontent.com/andrzejchm/notion-cli/main/docs/skills/using-notion-cli/SKILL.md \
  -o ~/.config/opencode/skills/using-notion-cli/SKILL.md
```
