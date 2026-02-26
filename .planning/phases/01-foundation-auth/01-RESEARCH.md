# Phase 1: Foundation & Auth - Research

**Researched:** 2026-02-26
**Domain:** CLI framework, Notion API authentication, config management, URL parsing
**Confidence:** HIGH

## Summary

Phase 1 establishes the CLI binary (`notion`), authentication via Notion integration tokens with named profiles, config file management (YAML), Notion URL parsing, and baseline error handling. The stack is well-defined by project constraints: Commander.js for CLI, `@notionhq/client` for API calls, `yaml` for config parsing, and `@inquirer/prompts` for interactive input during `notion init`.

The Notion SDK v5 (`@notionhq/client` 5.10.0) targets API version `2025-09-03` and provides built-in retry logic, typed error codes, and a simple `notion.users.me()` call for token validation. Commander.js 14.x supports nested subcommands, Help Groups for categorized `--help` output, and shell completions via `@commander-js/extra-typings`. Config management follows the user's locked decision of `~/.config/notion-cli/config.yaml` with XDG override support.

**Primary recommendation:** Use Commander.js with grouped subcommands, `@notionhq/client` for API validation, `yaml` for config read/write, `@inquirer/prompts` for interactive prompts, and `tsup` to produce a single bundled CLI binary.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multi-token support with named profiles (similar to gcloud CLI configurations)
- `notion init` creates/updates a profile — prompts for profile name and integration token
- Token validated against Notion API (`GET /users/me`) before saving
- If a token already exists for the profile, show current status and offer to replace
- Global named profiles + directory-level override via `.notion.yaml`
- `.notion.yaml` in project root can specify either `profile: <name>` (looks up global config) or `token: <value>` (direct token, useful for CI)
- Binary name is `notion` (no `ntn` alias)
- Grouped subcommands — related commands nest under a group (e.g., `notion db schema`, `notion db query`)
- Help output grouped by category (Auth, Read, Database, etc.) with short descriptions, like `gh --help`
- Shell completions from day one — `notion completion bash/zsh/fish` generates completion scripts
- Structured errors with error codes: `[AUTH_INVALID] Invalid token.\n  → Run "notion init" to reconfigure`
- Color only when TTY detected — no color when piped. `--color` flag to force color on.
- `--verbose` flag shows API requests/responses for debugging
- No spinners or progress indicators — just wait and show results
- Global config at `~/.config/notion-cli/config.yaml` (XDG default), YAML format consistent with `.notion.yaml`
- Token precedence: `NOTION_API_TOKEN` env var > `.notion.yaml` (local) > active profile (global)
- Always show token source on stderr: `Using token from NOTION_API_TOKEN` (or `from .notion.yaml` or `from profile: work`)
- Full profile management: `notion profile list`, `notion profile use <name>`, `notion profile remove <name>`

### Claude's Discretion
- Exact error code naming scheme
- YAML parsing library choice
- Config file migration strategy if format changes
- Internal project structure and module organization

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can run `notion init` to set up their Notion integration token with guided prompts | Commander.js subcommand + `@inquirer/prompts` for interactive input; detect non-TTY to skip prompts |
| AUTH-02 | `notion init` validates the token against Notion API (`GET /users/me`) before saving | `@notionhq/client` `notion.users.me()` — returns bot user on success, throws `APIResponseError` with `unauthorized` code on invalid token |
| AUTH-03 | Token and workspace config stored in `~/.config/notion-cli/config.yaml` (or `$XDG_CONFIG_HOME`) | `yaml` package for parse/stringify; `node:fs` for read/write; hand-roll XDG path resolution (`$XDG_CONFIG_HOME || ~/.config`) |
| AUTH-04 | Environment variables (`NOTION_API_TOKEN`) override config file values | Token resolution middleware: check env → `.notion.yaml` → active profile; report source on stderr |
| AUTH-05 | User can pass Notion URLs anywhere an ID is expected (URL parsing extracts page/database IDs) | Regex-based URL parser extracting 32-char hex IDs from various Notion URL formats |
| OUT-05 | Error messages go to stderr with exit code 1 | Commander.js `configureOutput` to route errors to stderr; `process.exit(1)` on unhandled errors |
| DIST-02 | CLI binary named `notion` | `package.json` `bin` field: `{ "notion": "./dist/cli.js" }` |
| DIST-03 | `notion --help` shows all commands with descriptions | Commander.js Help Groups feature for categorized output |
| DIST-04 | `notion --version` shows current version | Commander.js `.version()` method reading from `package.json` |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.0.3 | CLI framework (commands, options, help, parsing) | Most popular Node.js CLI framework; supports grouped help, subcommands, TypeScript, shell completions |
| @notionhq/client | 5.10.0 | Notion API SDK (auth validation, future API calls) | Official SDK by Notion; typed responses, built-in retry, error codes |
| yaml | 2.8.2 | YAML parse/stringify for config files | Full YAML 1.2 support; widely used; handles all YAML features needed for config |
| @inquirer/prompts | 8.3.0 | Interactive CLI prompts for `notion init` | Modern Inquirer rewrite; lightweight, async/await, supports input/confirm/password/select |
| tsup | 8.5.1 | TypeScript bundling to single CLI binary | Fast esbuild-based bundler; zero-config for CLI apps; produces CJS/ESM |
| vitest | 4.0.18 | Test framework | Fast, TypeScript-native, compatible with Jest API |
| typescript | ~5.9 | Type checking | Required by project constraints; Notion SDK v5 requires TS >= 5.9 for type definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @commander-js/extra-typings | 14.0.0 | Strong typing for Commander.js options/args | Use to get typed `.opts()` returns and `.action()` parameters |
| chalk | 5.6.2 | Terminal colors (TTY-only) | Use for colored error messages, status output; guard with TTY check |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs, oclif, clipanion | Commander is simpler, lighter, well-documented; oclif is heavier (framework, not library); yargs has less elegant subcommand nesting |
| yaml | js-yaml | `yaml` package has better YAML 1.2 compliance, better TypeScript types, and active maintenance; `js-yaml` is YAML 1.1 only |
| @inquirer/prompts | prompts, enquirer | @inquirer/prompts is the modern rewrite of the most popular prompt library; clean async/await API; prompts is lighter but less feature-rich |
| chalk | kleur, picocolors | chalk is the most widely used; picocolors is smaller but chalk's API is more ergonomic for structured error messages |

**Installation:**
```bash
npm install commander @notionhq/client yaml @inquirer/prompts chalk
npm install -D typescript tsup vitest @commander-js/extra-typings @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.ts               # Entry point — program definition, global options, parseAsync()
├── commands/
│   ├── init.ts           # notion init — profile setup
│   ├── profile/
│   │   ├── list.ts       # notion profile list
│   │   ├── use.ts        # notion profile use <name>
│   │   └── remove.ts     # notion profile remove <name>
│   └── completion.ts     # notion completion bash/zsh/fish
├── config/
│   ├── paths.ts          # XDG path resolution, config/local file locations
│   ├── config.ts         # Read/write global config.yaml, merge profiles
│   ├── local-config.ts   # Read .notion.yaml from cwd
│   └── token.ts          # Token resolution (env > local > profile), source reporting
├── notion/
│   ├── client.ts         # Create authenticated Notion client
│   └── url-parser.ts     # Parse Notion URLs → page/database IDs
├── errors/
│   ├── codes.ts          # Error code enum/constants
│   └── cli-error.ts      # Structured error class with code + suggestion
├── output/
│   ├── stderr.ts         # Stderr utilities (error formatting, source reporting)
│   └── color.ts          # TTY detection, chalk wrapper, --color flag
└── types/
    └── config.ts         # TypeScript types for config file structure
```

### Pattern 1: Command Registration with Commander.js Groups
**What:** Use Commander.js Help Groups to categorize commands in `--help`
**When to use:** Top-level program setup
**Example:**
```typescript
// Source: Commander.js README — Help Groups
import { Command } from 'commander';

const program = new Command();

program
  .name('notion')
  .description('Notion CLI — read Notion pages and databases from the terminal')
  .version(version);

// Global options
program
  .option('--verbose', 'show API requests/responses')
  .option('--color', 'force color output');

// Auth commands group
program.command('init')
  .summary('set up a Notion integration token')
  .description('Create or update a named profile with a Notion integration token')
  .action(initAction);

const profile = program.command('profile')
  .summary('manage authentication profiles');
profile.command('list').summary('list all profiles').action(profileListAction);
profile.command('use').argument('<name>').summary('set active profile').action(profileUseAction);
profile.command('remove').argument('<name>').summary('remove a profile').action(profileRemoveAction);

// Completion command
program.command('completion')
  .argument('<shell>', 'shell type (bash, zsh, fish)')
  .summary('generate shell completion script')
  .action(completionAction);

await program.parseAsync();
```

### Pattern 2: Token Resolution Chain
**What:** Layered token lookup with source reporting
**When to use:** Before any API call
**Example:**
```typescript
interface TokenResult {
  token: string;
  source: 'NOTION_API_TOKEN' | '.notion.yaml' | `profile: ${string}`;
}

function resolveToken(): TokenResult {
  // 1. Environment variable (highest priority)
  const envToken = process.env.NOTION_API_TOKEN;
  if (envToken) return { token: envToken, source: 'NOTION_API_TOKEN' };

  // 2. Local .notion.yaml
  const localConfig = readLocalConfig();
  if (localConfig?.token) return { token: localConfig.token, source: '.notion.yaml' };
  if (localConfig?.profile) {
    const profileToken = getProfileToken(localConfig.profile);
    if (profileToken) return { token: profileToken, source: `profile: ${localConfig.profile}` };
  }

  // 3. Active global profile
  const globalConfig = readGlobalConfig();
  if (globalConfig?.activeProfile) {
    const token = globalConfig.profiles?.[globalConfig.activeProfile]?.token;
    if (token) return { token, source: `profile: ${globalConfig.activeProfile}` };
  }

  throw new CliError('AUTH_NO_TOKEN', 'No authentication token found.', 'Run "notion init" to set up a profile');
}
```

### Pattern 3: Structured Error Handling
**What:** Error class with codes and actionable suggestions
**When to use:** All error conditions
**Example:**
```typescript
class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }

  format(): string {
    let output = `[${this.code}] ${this.message}`;
    if (this.suggestion) output += `\n  → ${this.suggestion}`;
    return output;
  }
}

// Usage in Commander action handler
async function withErrorHandling(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    if (error instanceof CliError) {
      process.stderr.write(error.format() + '\n');
    } else if (isNotionClientError(error)) {
      const mapped = mapNotionError(error);
      process.stderr.write(mapped.format() + '\n');
    } else {
      process.stderr.write(`[UNKNOWN] ${error instanceof Error ? error.message : String(error)}\n`);
    }
    process.exit(1);
  }
}
```

### Pattern 4: Notion URL Parsing
**What:** Extract page/database IDs from various Notion URL formats
**When to use:** Any argument that accepts an ID or URL
**Example:**
```typescript
/**
 * Notion URLs come in several formats:
 * - https://www.notion.so/workspace/Page-Title-b55c9c91384d452b81dbd1ef79372b75
 * - https://www.notion.so/b55c9c91384d452b81dbd1ef79372b75
 * - https://www.notion.so/workspace/b55c9c91384d452b81dbd1ef79372b75?v=...
 * - https://notion.so/Page-Title-b55c9c91384d452b81dbd1ef79372b75
 * - b55c9c91-384d-452b-81db-d1ef79372b75 (raw UUID)
 * - b55c9c91384d452b81dbd1ef79372b75 (UUID without dashes)
 *
 * The ID is always a 32-char hex string (UUID without dashes) at the end of the path.
 */
const NOTION_ID_REGEX = /^[a-f0-9]{32}$/;
const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const NOTION_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?notion\.(?:so|site)\/(?:.*?)([a-f0-9]{32})(?:\?.*)?$/;

function parseNotionId(input: string): string {
  // Raw UUID with dashes
  if (UUID_REGEX.test(input)) return input.replace(/-/g, '');
  // Raw 32-char hex ID
  if (NOTION_ID_REGEX.test(input)) return input;
  // Notion URL
  const match = input.match(NOTION_URL_REGEX);
  if (match) return match[1];
  throw new CliError('INVALID_ID', `Cannot parse Notion ID from: ${input}`, 'Provide a valid Notion URL or page/database ID');
}

// Format back to UUID for API calls
function toUuid(id: string): string {
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
```

### Pattern 5: Config File Structure
**What:** Global config YAML schema and local `.notion.yaml` schema
**When to use:** Config read/write operations
**Example:**
```yaml
# ~/.config/notion-cli/config.yaml
active_profile: work
profiles:
  work:
    token: ntn_xxxxxxxxxxxxxxxxxxxxx
    workspace_name: "My Workspace"    # cached from validation response
    workspace_id: "abc123..."         # cached from validation response
  personal:
    token: ntn_yyyyyyyyyyyyyyyyyyyyy
    workspace_name: "Personal"
    workspace_id: "def456..."
```
```yaml
# .notion.yaml (project-level override)
# Option A: reference a global profile
profile: work

# Option B: direct token (e.g., for CI)
token: ntn_zzzzzzzzzzzzzzzzzzzzz
```

### Anti-Patterns to Avoid
- **Storing tokens in plaintext JSON visible via `cat`**: YAML is fine since tokens are inherently plaintext integration tokens, but ensure file permissions are 0600 on the config file.
- **Synchronous file I/O in command handlers**: Use async `fs.promises` for all config read/write to keep the event loop available.
- **Hard-coding config paths**: Always resolve via `$XDG_CONFIG_HOME` with `~/.config` fallback. Never assume `~/.config` without checking the env var.
- **Catching errors silently**: Every error path must exit with code 1 and produce stderr output.
- **Importing the entire Notion SDK at startup**: Lazy-import `@notionhq/client` only when an API call is needed (e.g., `notion init` validation) to keep `notion --help` and `notion --version` fast.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom argv parser | Commander.js | Edge cases in option parsing, help generation, validation are enormous |
| YAML parsing | Custom YAML parser | `yaml` package | YAML spec is complex; custom parsers break on edge cases |
| Interactive prompts | Raw readline | `@inquirer/prompts` | Input masking (tokens), validation, ctrl+c handling, non-TTY detection |
| Notion API HTTP calls | Raw fetch/axios | `@notionhq/client` | Auth headers, retry logic, rate limiting, typed responses, error mapping |
| Terminal color detection | Custom TTY checks | chalk (auto-detects) | chalk handles `NO_COLOR`, `FORCE_COLOR`, pipe detection, CI detection |
| Shell completions | Hand-written scripts | Commander.js built-in or tabtab | Shell-specific quoting, escaping, completion protocol is error-prone |

**Key insight:** This phase is primarily infrastructure. Every component has mature, well-tested libraries. Hand-rolling any of these would introduce subtle bugs that only surface in edge cases (non-TTY environments, unusual shells, YAML edge cases).

## Common Pitfalls

### Pitfall 1: ESM vs CJS Module Issues
**What goes wrong:** `@notionhq/client` v5, `chalk` v5, and `@inquirer/prompts` are ESM-only. Mixing with CJS causes `ERR_REQUIRE_ESM` errors.
**Why it happens:** Node.js module resolution differs between ESM and CJS.
**How to avoid:** Set `"type": "module"` in `package.json`. Configure tsup to output ESM (`format: ['esm']`). Use `import` everywhere.
**Warning signs:** `ERR_REQUIRE_ESM`, `SyntaxError: Cannot use import statement in a module`.

### Pitfall 2: Config File Race Conditions
**What goes wrong:** Two CLI invocations writing config simultaneously can corrupt the file.
**Why it happens:** Read-modify-write cycle without locking.
**How to avoid:** Use atomic write (write to temp file, then rename). `node:fs.rename()` is atomic on most filesystems.
**Warning signs:** Truncated or empty config files after parallel operations.

### Pitfall 3: Token Leaking in Verbose Output
**What goes wrong:** `--verbose` flag logs full API requests including the Authorization header.
**Why it happens:** Naive request logging includes all headers.
**How to avoid:** Redact the token in verbose output: show `Bearer ntn_...xxxx` (first 4 + last 4 chars).
**Warning signs:** Full tokens appearing in terminal scrollback or CI logs.

### Pitfall 4: Notion URL Format Changes
**What goes wrong:** URL parser fails on notion.site domains, or new URL formats.
**Why it happens:** Notion uses both `notion.so` and `notion.site` domains, and URL structure can vary.
**How to avoid:** Support both `notion.so` and `notion.site` domains. Extract the 32-char hex ID from the end of the path segment. Write comprehensive test cases for all known URL formats.
**Warning signs:** Users reporting "cannot parse URL" errors.

### Pitfall 5: Forgotten Async parseAsync
**What goes wrong:** Async action handlers don't complete; unhandled promise rejections.
**Why it happens:** Using `program.parse()` instead of `await program.parseAsync()` when actions are async.
**How to avoid:** Always use `parseAsync()`. Wrap the top-level in an async IIFE or top-level await.
**Warning signs:** Process exits before API calls complete.

### Pitfall 6: Non-TTY Environments (CI/Agents)
**What goes wrong:** Interactive prompts hang in CI or when piped.
**Why it happens:** `@inquirer/prompts` waits for user input that never comes.
**How to avoid:** Check `process.stdin.isTTY` before prompting. In non-TTY mode, require all inputs via flags/env vars and error if missing. `@inquirer/prompts` supports an `AbortSignal` for timeouts.
**Warning signs:** CI pipeline hangs, agent sessions hang.

### Pitfall 7: chalk v5 ESM Import
**What goes wrong:** `const chalk = require('chalk')` fails.
**Why it happens:** chalk v5 is ESM-only.
**How to avoid:** Use `import chalk from 'chalk'` with ESM project setup. Alternatively, use chalk v4 (CJS) if ESM is problematic.
**Warning signs:** `ERR_REQUIRE_ESM` at runtime.

## Code Examples

Verified patterns from official sources:

### Notion SDK Token Validation
```typescript
// Source: Notion SDK README + API reference (developers.notion.com/reference/get-self)
import { Client, APIErrorCode, isNotionClientError } from '@notionhq/client';

async function validateToken(token: string): Promise<{ workspaceName: string; workspaceId: string }> {
  const notion = new Client({ auth: token });
  try {
    const response = await notion.users.me();
    // Bot user response includes workspace info
    if (response.type === 'bot' && response.bot.workspace_name) {
      return {
        workspaceName: response.bot.workspace_name,
        workspaceId: response.bot.workspace_id,
      };
    }
    return { workspaceName: 'Unknown', workspaceId: '' };
  } catch (error) {
    if (isNotionClientError(error) && error.code === APIErrorCode.Unauthorized) {
      throw new CliError('AUTH_INVALID', 'Invalid integration token.', 'Check your token at notion.so/my-integrations');
    }
    throw error;
  }
}
```

### YAML Config Read/Write
```typescript
// Source: yaml package docs (https://eemeli.org/yaml/)
import { parse, stringify } from 'yaml';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

interface GlobalConfig {
  active_profile?: string;
  profiles?: Record<string, { token: string; workspace_name?: string; workspace_id?: string }>;
}

async function readConfig(configPath: string): Promise<GlobalConfig> {
  try {
    const content = await readFile(configPath, 'utf-8');
    return parse(content) ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

async function writeConfig(configPath: string, config: GlobalConfig): Promise<void> {
  const dir = dirname(configPath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const tmpPath = configPath + '.tmp';
  await writeFile(tmpPath, stringify(config), { mode: 0o600 });
  await rename(tmpPath, configPath);
}
```

### Interactive Init Flow
```typescript
// Source: @inquirer/prompts README
import { input, confirm, password } from '@inquirer/prompts';

async function initProfile(): Promise<void> {
  const profileName = await input({
    message: 'Profile name:',
    default: 'default',
  });

  const token = await password({
    message: 'Integration token (from notion.so/my-integrations):',
    mask: '*',
  });

  // Validate before saving
  const workspace = await validateToken(token);
  console.error(`✓ Connected to workspace "${workspace.workspaceName}"`);

  // Check for existing profile
  const config = await readConfig(getConfigPath());
  if (config.profiles?.[profileName]) {
    const replace = await confirm({
      message: `Profile "${profileName}" already exists. Replace?`,
    });
    if (!replace) {
      console.error('Aborted.');
      process.exit(0);
    }
  }

  // Save
  config.profiles = config.profiles ?? {};
  config.profiles[profileName] = {
    token,
    workspace_name: workspace.workspaceName,
    workspace_id: workspace.workspaceId,
  };
  config.active_profile = profileName;
  await writeConfig(getConfigPath(), config);
  console.error(`Profile "${profileName}" saved and set as active.`);
}
```

### XDG Config Path Resolution
```typescript
// Hand-rolled XDG resolution (not using env-paths because user locked path to ~/.config/notion-cli)
import { homedir } from 'node:os';
import { join } from 'node:path';

function getConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  const base = xdgConfig || join(homedir(), '.config');
  return join(base, 'notion-cli');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.yaml');
}
```

### tsup Configuration for CLI
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false, // no need for declaration files in a CLI
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

### Commander.js Error Output Configuration
```typescript
// Source: Commander.js README — configureOutput
import { Command } from 'commander';

const program = new Command();

program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(str),
  outputError: (str, write) => {
    write(`[CLI_ERROR] ${str}`);
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@notionhq/client` v2 with API 2022-02-22 | v5.10.0 with API 2025-09-03 | 2025 | v5 dropped support for pre-2022-06-28 API versions; new `dataSources` concept replaces some database patterns |
| `inquirer` (legacy, callback-based) | `@inquirer/prompts` (modern, async/await) | 2023 | Smaller bundle, better TypeScript support, no legacy baggage |
| chalk v4 (CJS) | chalk v5 (ESM-only) | 2022 | Must use ESM project setup; no CJS fallback |
| Commander.js v9 | Commander.js v14 | 2024-2025 | Help Groups added (v12+), improved TypeScript via extra-typings |
| `js-yaml` (YAML 1.1) | `yaml` package (YAML 1.2) | Ongoing | Better spec compliance, maintained actively |

**Deprecated/outdated:**
- `inquirer` (legacy): Still maintained but not actively developed. Use `@inquirer/prompts` instead.
- `xdg-basedir`: Linux-only. Use hand-rolled XDG resolution or `env-paths` for cross-platform. For this project, hand-roll since path is locked to `~/.config/notion-cli`.
- `@notionhq/client` v2-v4: Dropped. v5 requires API version 2025-09-03.

## Open Questions

1. **Shell completion implementation**
   - What we know: Commander.js does not have built-in shell completion generation. The community typically uses `tabtab` or generates static completion scripts.
   - What's unclear: Whether Commander.js v14 added native completion support, or if we need a third-party library like `tabtab` or `omelette`.
   - Recommendation: Start with a simple static completion script generator for bash/zsh/fish. Can be a `notion completion <shell>` command that outputs the script to stdout. Reference how `gh completion` works.

2. **Config file permissions on Windows**
   - What we know: `mode: 0o600` in `writeFile` works on Unix but is ignored on Windows.
   - What's unclear: Whether Windows users need special handling.
   - Recommendation: Apply Unix permissions where supported. Windows NTFS ACLs are a different model — defer Windows-specific handling. Document that tokens are stored in plaintext.

3. **`notion` binary name conflict**
   - What we know: The binary is named `notion` per locked decision.
   - What's unclear: Whether there are other packages on npm already using the `notion` binary name that could conflict during `npm install -g`.
   - Recommendation: Proceed with `notion`. If conflicts arise, address in Phase 5 (Distribution).

## Sources

### Primary (HIGH confidence)
- Commander.js README (https://github.com/tj/commander.js) — CLI framework features, Help Groups, subcommands, TypeScript
- @notionhq/client README (https://github.com/makenotion/notion-sdk-js) — SDK initialization, users.me(), error handling, types, v5 requirements
- Notion API reference: GET /v1/users/me (https://developers.notion.com/reference/get-self) — Token validation endpoint, response schema, error codes
- Notion API versioning (https://developers.notion.com/reference/versioning) — Latest API version 2025-09-03, SDK v5 compatibility
- @inquirer/prompts README (https://github.com/SBoudrias/Inquirer.js) — Modern async prompt API, input/password/confirm
- env-paths README (https://github.com/sindresorhus/env-paths) — Cross-platform paths (used as reference; not used directly due to locked path decision)
- npm registry — verified current versions of all packages

### Secondary (MEDIUM confidence)
- yaml package (https://eemeli.org/yaml/) — API not fetched directly, but well-known stable API (parse/stringify)

### Tertiary (LOW confidence)
- Shell completion implementation details — no authoritative source found for Commander.js native completions; tabtab library may be needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official READMEs and npm registry; versions confirmed
- Architecture: HIGH — patterns follow Commander.js and Notion SDK documented patterns; config structure matches user decisions
- Pitfalls: HIGH — ESM/CJS issues, non-TTY handling, and URL parsing are well-documented concerns in the Node.js CLI ecosystem

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable ecosystem, low churn)
