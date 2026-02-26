# notion — Notion CLI

## What This Is

A command-line interface for Notion workspaces, built primarily for AI coding agents (Claude Code, Codex, OpenCode) with human-friendly output as a secondary mode. The CLI (`notion`) lets agents and humans search, browse databases, and read Notion pages as markdown — all from the terminal without browser context-switching.

## Core Value

AI coding agents can read any Notion page or database as structured data (JSON or markdown) without leaving the terminal, enabling seamless integration of Notion context into coding workflows.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Search Notion workspace by keyword
- [ ] Browse databases and list entries with filtering
- [ ] Read any page as full-fidelity markdown (all block types)
- [ ] Dual-mode output: TTY = formatted tables/markdown, piped = JSON or markdown (agent's choice)
- [ ] Internal integration token auth with `notion init` setup
- [ ] Agent skill/instruction file for Claude Code, OpenCode, Codex
- [ ] npm global install (`@andrzejchm/notion-cli`)
- [ ] Homebrew distribution
- [ ] Read-only for v1 (no write operations)

### Out of Scope

- Write operations (create/update pages from markdown) — deferred to v2, focus on solid reading first
- OAuth public integration auth — internal token sufficient for agent use cases
- MCP server mode — CLI-only approach, fewer moving parts for agents
- Real-time sync/watch mode — not needed for agent workflows
- Mobile/GUI interface — terminal-only tool

## Context

- Inspired by the ClickUp CLI (`cu` by krodak) which uses dual-mode output (TTY tables for humans, JSON for piped/agent use)
- Notion's API covers pages, databases, blocks, users, comments, and search
- Notion blocks are complex — headings, lists, toggles, tables, callouts, code blocks, embeds, synced blocks, columns — full-fidelity markdown conversion is a significant effort
- The official Notion SDK for JavaScript exists: `@notionhq/client`
- Target users are developers using AI coding agents who have Notion workspaces for project management, documentation, or knowledge bases
- Command name: `notion` — clear and obvious, matches the service name

## Constraints

- **Tech stack**: TypeScript + Node 22+ — matches ecosystem (Notion SDK is JS), enables npm distribution
- **Build tooling**: tsup for bundling, vitest for testing (same as ClickUp CLI reference)
- **CLI framework**: Commander.js — proven, widely used
- **Auth**: Internal integration token only (from Notion integration settings)
- **API**: Notion REST API v1 (2022-06-28 or latest stable)
- **Read-only v1**: No write operations in first release — reduces scope, ships faster
- **Output formats**: JSON (structured) and markdown (content) — agent chooses via flags

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CLI-only, no MCP server | Fewer moving parts, agents already know shell commands, skill file teaches patterns | — Pending |
| `notion` as command name | Clear, obvious, matches the service name | — Pending |
| Read-only v1 | Ship fast, nail the reading experience before tackling markdown-to-blocks conversion | — Pending |
| Full-fidelity block conversion | Agents need complete page content, lossy conversion defeats the purpose | — Pending |
| Dual output: JSON + markdown | JSON for structured data (DB entries, properties), markdown for page content | — Pending |
| Internal token auth only | Simpler setup, sufficient for agent/developer use case | — Pending |
| TypeScript + Node | Matches Notion SDK ecosystem, enables npm distribution | — Pending |

---
*Last updated: 2026-02-26 after initialization*
