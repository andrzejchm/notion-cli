# notion-cli

> Read Notion pages and databases from your terminal — built for AI coding agents and developers.

[![npm version](https://img.shields.io/npm/v/@andrzejchm/notion-cli.svg?style=flat&color=4B78E6)](https://www.npmjs.com/package/@andrzejchm/notion-cli)
[![Node.js >=22](https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

```bash
npm install -g @andrzejchm/notion-cli
notion init   # paste your Notion integration token once
```

---

## Features

- **`notion search`** — find any page or database by title
- **`notion read`** — render any page as full-fidelity markdown
- **`notion db query`** — filter, sort, and select columns from any database
- **Agent-friendly** — auto-detects piped context and outputs JSON; formatted tables in TTY
- **Flexible auth** — interactive setup or `NOTION_API_TOKEN` env var
- **Accepts URLs** — pass full Notion URLs anywhere an ID is expected

---

## Getting Started

### 1. Install

```bash
npm install -g @andrzejchm/notion-cli
```

### 2. Create a Notion integration

Go to [notion.so/profile/integrations/internal](https://www.notion.so/profile/integrations/internal) → **New integration** → copy the token.

### 3. Authenticate

```bash
notion init
# or: export NOTION_API_TOKEN=ntn_your_token_here
```

### 4. Share pages with your integration

Open any Notion page → `⋯` menu → **Add connections** → select your integration.

### 5. Run your first command

```bash
notion search "meeting notes"
notion read https://www.notion.so/workspace/My-Page-abc123
```

---

## Examples

```bash
# Search for a page, then read it
PAGE_ID=$(notion search "Q1 Planning" | jq -r '.[0].id')
notion read "$PAGE_ID"

# Query a database with filters
notion db query "$DB_ID" --filter "Status=In Progress" --sort "Priority:asc"

# Get JSON output for scripting / AI agents
notion db query "$DB_ID" --filter "Status=Done" | jq '.[] | .properties.Title'

# Inspect a database schema before querying
notion db schema "$DB_ID"

# List everything your integration can access
notion ls
```

---

## Commands

| Command | Description |
|---------|-------------|
| `notion init` | Set up your Notion integration token |
| `notion search <query>` | Search pages and databases by title |
| `notion ls` | List all accessible pages and databases |
| `notion open <id\|url>` | Open a page in your browser |
| `notion read <id\|url>` | Read a page as markdown |
| `notion db schema <id\|url>` | Show database property schema and valid values |
| `notion db query <id\|url>` | Query database entries with filtering and sorting |
| `notion users` | List workspace members |
| `notion comments <id\|url>` | Read page comments |
| `notion profile list\|use\|remove` | Manage multiple auth profiles |
| `notion completion bash\|zsh\|fish` | Install shell tab completion |

### `notion db query` flags

| Flag | Example | Description |
|------|---------|-------------|
| `--filter` | `--filter "Status=Done"` | Filter by property value (repeatable) |
| `--sort` | `--sort "Created:desc"` | Sort by property (`:asc` or `:desc`) |
| `--columns` | `--columns "Title,Status"` | Only show specific columns |
| `--json` | `--json` | Force JSON output |

---

## Output Modes

The CLI auto-detects your context:

| Context | Default output | Override |
|---------|----------------|----------|
| Terminal (TTY) | Formatted tables, colored | `--json` for raw JSON |
| Piped / agent | JSON | `--md` for markdown |

`notion read` always outputs **markdown** regardless of context — even when piped.

---

## For AI Agents

Pipe commands to get JSON output that's easy to process:

```bash
# Find a page ID
notion search "project spec" | jq -r '.[0].id'

# Read items with a specific status
notion db query "$DB_ID" --filter "Status=In Progress" | jq '.[] | {id, title: .properties.Name}'

# Read page content (markdown works great in agents)
notion read "$PAGE_ID"
```

For Claude Code, OpenCode, and Codex — including copy-paste setup snippets and common agent patterns — see [`docs/agent-skill.md`](docs/agent-skill.md).

---

## Authentication

```bash
# Interactive setup (recommended for first-time use)
notion init

# Environment variable (CI, Docker, agents)
export NOTION_API_TOKEN=ntn_your_token_here

# Multiple workspaces
notion init                    # saves as "default"
notion profile list
notion profile use <name>
```

Token format: starts with `ntn_` (new) or `secret_` (legacy integrations).  
Get a token: [notion.so/profile/integrations/internal](https://www.notion.so/profile/integrations/internal)

---

## Troubleshooting

**Page not found (404):** Share the page with your integration — open the page → `⋯` → **Add connections**.

**Unauthorized (401):** Run `notion init` to reconfigure, or check your `NOTION_API_TOKEN`.

**Search returns nothing:** Search is title-only. The page must also be shared with your integration.

**Empty database query:** Run `notion db schema <id>` first to see valid property names and values.

---

## License

MIT © [Andrzej Chm](https://github.com/andrzejchm)
