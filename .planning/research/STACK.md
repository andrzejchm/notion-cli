# Stack Research

**Domain:** CLI tool — Notion workspace reader for AI coding agents and developers
**Researched:** 2026-02-26
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ~5.7 | Language | Type safety for complex Notion API types; the official SDK ships comprehensive TS types. Matches ecosystem constraint from PROJECT.md. |
| Node.js | 22+ (LTS) | Runtime | Required by PROJECT.md. Node 22 is current LTS (active through Oct 2027). Supports `require(esm)` which simplifies Commander.js v14 usage. |
| Commander.js | 14.0.3 | CLI framework | 28k stars, proven, widely used. v14 is latest stable (v15.0.0-0 is pre-release ESM-only, ships May 2026 — avoid for now). Subcommands, auto-help, option parsing all built-in. PROJECT.md already specifies it. |
| @notionhq/client | 5.9.0 | Notion API client | Official SDK from Notion. v5+ requires API version 2025-09-03. Full TypeScript types, built-in pagination helpers (`iteratePaginatedAPI`, `collectPaginatedAPI`), automatic retries with exponential backoff on 429/500/503, type guards (`isFullPage`, `isFullBlock`, etc.). |
| tsup | 8.5.1 | Bundling | Zero-config TypeScript bundler built on esbuild. Produces CJS/ESM bundles, handles `.d.ts` generation, shebang injection for CLI bins. PROJECT.md already specifies it. |
| vitest | 3.x (stable) | Testing | v3 is current stable (v4 is beta). Fast, native TypeScript support, Jest-compatible API. No separate ts-jest config needed. PROJECT.md already specifies it. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| notion-to-md | 3.1.9 | Notion blocks to markdown | Use for page content rendering. v3 is stable and battle-tested (1.7k stars, 14.9k dependents). v4 (alpha) adds plugin architecture but is not production-ready — do NOT use v4 yet. Supports custom transformers for block types. |
| chalk | 5.6.2 | Terminal colors | ESM-only since v5. Use for human-readable TTY output — colored headings, status indicators, error messages. 23k stars, actively maintained. |
| cli-table3 | 0.6.5 | Table formatting | Unicode table rendering for database listings. Supports column spans, custom borders, ANSI color in cells. API-compatible successor to cli-table/cli-table2. |
| zod | 4.3.6 | Config & input validation | Validate stored config (auth token format), command arguments, API response shapes. 42k stars, tree-shakeable in v4, zero dependencies. |
| @inquirer/prompts | latest | Interactive prompts | For `ntn init` — token input, workspace selection. New modular API (not legacy `inquirer`). Each prompt is a standalone import. |
| conf | 13.x | Config file storage | JSON config stored in OS-appropriate location (`~/.config/ntn/`). Handles atomic writes, schema validation, dot-notation access. Ideal for storing auth token. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsup | Build & bundle | Config: `tsup.config.ts` with `entry: ['src/index.ts']`, `format: ['esm']`, `dts: true`, `clean: true`, `shims: true`. Add `banner` for shebang (`#!/usr/bin/env node`). |
| vitest | Test runner | Config: `vitest.config.ts`. Use `vi.mock()` for Notion client mocking. Built-in coverage via `@vitest/coverage-v8`. |
| typescript | Type checking | `tsc --noEmit` for type checking only (tsup handles compilation). Target `ES2022`, module `ESNext`. |
| eslint | Linting | Use flat config (`eslint.config.js`) with `@typescript-eslint/eslint-plugin`. |
| prettier | Formatting | Standard config. Integrates with eslint via `eslint-config-prettier`. |
| changeset | Versioning | `@changesets/cli` for semantic versioning and changelog generation for npm publishing. |

## Installation

```bash
# Core
npm install @notionhq/client commander notion-to-md chalk cli-table3 zod @inquirer/prompts conf

# Dev dependencies
npm install -D typescript tsup vitest @vitest/coverage-v8 @types/node eslint @typescript-eslint/eslint-plugin prettier eslint-config-prettier @changesets/cli
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Commander.js v14 | clipanion (by Yarn) | If you need class-based command architecture with type inference. Commander is simpler and more widely known. |
| Commander.js v14 | oclif (by Salesforce) | If building a plugin-extensible CLI framework. Massive overkill for a focused tool like `ntn`. |
| Commander.js v14 | yargs | Similar feature set but Commander has cleaner TS types and subcommand patterns. |
| notion-to-md v3 | Custom block-to-md converter | If notion-to-md doesn't cover specific block types (columns, synced blocks). You may need custom transformers anyway — notion-to-md supports `setCustomTransformer()` for this. |
| chalk v5 | yoctocolors | If absolute minimal bundle size matters. For a CLI distributed via npm, chalk's size is negligible and the API is far better. |
| chalk v5 | picocolors | Same as yoctocolors — tiny but limited API. Chalk is already in most dependency trees. |
| cli-table3 | columnify | If you only need simple columnar output (no borders). cli-table3 is more flexible for database views. |
| conf | dotenv + manual file | If you want `.env`-style config. `conf` is better because it handles XDG paths, atomic writes, and schema validation. |
| zod v4 | arktype | Newer, potentially faster. But Zod has 42k stars, massive ecosystem, and proven stability. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Commander.js v15 (pre-release) | v15.0.0-0 is ESM-only pre-release (Feb 2026). Breaking change: requires Node 22.12.0+, drops CJS support. Not stable yet — ships May 2026. | Commander.js v14.0.3 — stable, dual CJS/ESM, security support until May 2027. |
| notion-to-md v4 (alpha) | v4.0.0-alpha.5 is a complete rewrite with plugin architecture. Not production-ready — API may change. | notion-to-md v3.1.9 — stable, well-documented, 14.9k dependents. Migrate to v4 later when stable. |
| @notionhq/client v4.x or below | Doesn't support Notion API 2025-09-03. Missing newer endpoints, data sources API, and improved retry logic. | @notionhq/client v5.9.0 — supports latest API version, better TypeScript types. |
| `inquirer` (legacy package) | Old monolithic package with large bundle. The new `@inquirer/prompts` is modular, smaller, and actively developed. | `@inquirer/prompts` — individual imports, smaller footprint. |
| ora (spinner) | Adds complexity for minimal value in a CLI that mostly does quick API calls. Spinners are annoying when piped. | Simple `process.stderr.write()` for progress, or nothing — most commands complete in <2 seconds. |
| chalk v4 | CJS-only. Since we're building ESM-first with tsup, use the ESM-native v5. TypeScript users should use v5. | chalk v5.6.2 |
| meow | Lightweight CLI helper but lacks subcommands. `ntn` needs subcommands (search, db, page, init). | Commander.js — proper subcommand support. |
| Bun runtime | Not compatible with all npm packages. Node 22 is the safe choice for npm distribution target per PROJECT.md constraint. | Node.js 22 LTS |

## Stack Patterns by Variant

**If targeting npm global install only (`npm i -g @andrzejchm/notion-cli`):**
- Bundle as ESM with tsup, set `"type": "module"` in package.json
- Use `"bin": { "ntn": "./dist/index.js" }` with shebang
- Works on Node 22+ which all target users will have

**If adding Homebrew distribution later:**
- tsup can produce a self-contained single-file bundle
- Use `--noExternal` to inline all dependencies
- Wrap in a shell script that invokes `node` on the bundled file
- Consider `pkg` or `sea` (Node.js Single Executable Applications) for binary distribution

**If piped (non-TTY) output for agents:**
- Detect with `process.stdout.isTTY`
- TTY: chalk colors + cli-table3 tables
- Non-TTY: raw JSON (no colors, no table borders)
- Use `--json` flag to force JSON regardless of TTY
- Use `--md` flag to force markdown output for page content

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @notionhq/client@5.9.0 | Notion API 2025-09-03+ | v5 dropped support for API versions before 2025-09-03. This is the latest API version. |
| @notionhq/client@5.9.0 | Node >= 18, TypeScript >= 5.9 | Official minimum requirements per SDK README. |
| Commander.js@14.0.3 | Node >= 16 | Wide compatibility. Dual CJS/ESM. |
| tsup@8.5.1 | esbuild 0.25+ | Internally uses esbuild. No user-facing compatibility concerns. |
| vitest@3.x | Node >= 18 | Shares Vite's transform pipeline. |
| chalk@5.6.2 | Node >= 12.20 (ESM) | ESM-only. No CJS import possible without dynamic `import()`. |
| notion-to-md@3.1.9 | @notionhq/client@2.x+ | Peer dependency. Verify v3 works with @notionhq/client v5 — the block types API is stable. If incompatible, use custom transformers or fork. **LOW confidence — needs testing.** |
| zod@4.3.6 | Node >= 18 | Tree-shakeable. Zero dependencies. |

## Critical Compatibility Note

**notion-to-md v3 + @notionhq/client v5:** The biggest compatibility risk in this stack. notion-to-md v3 was built against @notionhq/client v2.x types. The v5 SDK changed some type names (e.g., `database` -> `data_source` in some contexts) and requires API version 2025-09-03. notion-to-md may still work because it primarily uses `blocks.children.list` which is stable, but type mismatches are possible. **Mitigation:** Test early in Phase 1. If types conflict, use `as any` casts at the boundary or write a thin adapter. notion-to-md v4 (when stable) will likely support the new SDK.

## Sources

- GitHub: makenotion/notion-sdk-js — v5.9.0 release (Jan 29, 2026), README with API docs, compatibility table. **HIGH confidence.**
- GitHub: tj/commander.js — v14.0.3 release (Jan 31, 2026), v15.0.0-0 pre-release notes (Feb 21, 2026). **HIGH confidence.**
- GitHub: egoist/tsup — v8.5.1 release (Nov 12, 2025). **HIGH confidence.**
- GitHub: vitest-dev/vitest — v3.x stable, v4.1.0-beta.5 (Feb 26, 2026). **HIGH confidence.**
- GitHub: chalk/chalk — v5.6.2 release (Sep 8, 2025), README. **HIGH confidence.**
- GitHub: souvikinator/notion-to-md — v3.1.9 (May 12, 2025), v4 docs at notionconvert.com/docs/v4. **HIGH confidence for v3, MEDIUM for v4 alpha status.**
- GitHub: cli-table/cli-table3 — v0.6.5 (May 12, 2024), README. **HIGH confidence.**
- GitHub: colinhacks/zod — v4.3.6 (Jan 22, 2026). **HIGH confidence.**
- Notion API versioning docs: developers.notion.com/reference/versioning — confirms 2025-09-03 as latest. **HIGH confidence.**
- GitHub: SBoudrias/Inquirer.js — @inquirer/prompts, modular rewrite. **HIGH confidence.**

---
*Stack research for: ntn — Notion CLI*
*Researched: 2026-02-26*
