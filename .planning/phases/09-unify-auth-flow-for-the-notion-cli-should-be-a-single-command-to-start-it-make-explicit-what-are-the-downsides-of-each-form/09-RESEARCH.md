# Phase 9: Unify Auth Flow — Research

**Researched:** 2026-02-28
**Domain:** CLI UX / Authentication command design
**Confidence:** HIGH

## Summary

The project currently has two separate authentication entry points that serve different purposes but are not obviously related to first-time users:

1. `notion init` — sets up an **internal integration token** (bot-attributed, for read-only or CI use)
2. `notion auth login` — sets up **OAuth user tokens** (user-attributed, for write operations)

These are fundamentally different auth mechanisms with different tradeoffs, yet the user must discover both independently. Phase 9 aims to provide a **single unified entry point** — `notion auth` (or a redesigned `notion init`) — that guides the user through choosing their auth method while clearly explaining the tradeoffs of each approach.

The core technical challenge is designing an interactive selection flow (using the already-available `@inquirer/prompts` `select` prompt) that presents both methods, explains their tradeoffs in plain language, and then delegates to the existing implementation logic. No new auth mechanisms are needed — only new UX wiring and documentation updates.

**Primary recommendation:** Create a new `notion auth` entry-point command (the `auth` group already exists) that, when called with no subcommand, presents an interactive selector. The existing `notion init` and `notion auth login` commands remain available as direct shortcuts, but `notion auth` becomes the recommended starting point. Update README and SKILL.md to use `notion auth` as the canonical first step.

---

## Current State Analysis

### Auth Entry Points (as implemented)

| Command | What it sets up | Token stored | Attribution | Requires |
|---------|----------------|--------------|-------------|----------|
| `notion init` | Internal integration token | `profiles[name].token` | Integration bot | Notion integration created by user |
| `notion auth login` | OAuth access + refresh tokens | `profiles[name].oauth_*` | Actual Notion user | Browser (or `--manual` for headless) |
| `NOTION_API_TOKEN` env var | Transient override | Not stored | Integration bot | Integration token available |

### Token Resolution Priority (src/config/token.ts)

```
NOTION_API_TOKEN env > .notion.yaml token > profile oauth_access_token > profile.token
```

OAuth takes precedence over internal integration token within a profile.

### Auth Command Group (src/cli.ts:72-77)

```typescript
const authCmd = new Command('auth').description('manage Notion authentication');
authCmd.addCommand(loginCommand());
authCmd.addCommand(logoutCommand());
authCmd.addCommand(statusCommand());
program.addCommand(authCmd);
```

Currently `notion auth` with no subcommand shows Commander's default help — it doesn't act as an interactive entry point.

### The UX Gap

- `notion init` has no hint about OAuth until the **very end** of the flow (a dim message at line 103-104 of `init.ts`)
- `notion auth login` requires the user to already know it exists
- The README lists them as two separate sections without guiding the user to the right one
- First-time users don't know which to start with

---

## Architecture Patterns

### Pattern 1: Interactive Selector as Auth Entry Point

**What:** `notion auth` with no subcommand runs an interactive `select` prompt letting the user choose their auth method, then delegates to the appropriate flow.

**When to use:** New user running auth for the first time, or user who wants to reconfigure.

**Example using existing `@inquirer/prompts`:**

```typescript
// Source: @inquirer/prompts (already installed, select export confirmed)
import { select } from '@inquirer/prompts';

const method = await select({
  message: 'How do you want to authenticate with Notion?',
  choices: [
    {
      name: 'OAuth user login (recommended)',
      value: 'oauth',
      description:
        'Opens your browser. Comments and pages attributed to your Notion account. Requires browser access.',
    },
    {
      name: 'Internal integration token',
      value: 'token',
      description:
        'Paste a token from notion.so/profile/integrations. Works in CI/headless. Write ops attributed to integration bot.',
    },
  ],
});

if (method === 'oauth') {
  // delegate to login flow (same logic as notion auth login)
} else {
  // delegate to init flow (same logic as notion init)
}
```

**Note:** The `select` prompt from `@inquirer/prompts` v8 supports `description` on each choice — this is exactly how to surface tradeoffs inline.

### Pattern 2: Commander Default Action

Commander supports `.action()` on a parent command. When a user runs `notion auth` with no subcommand, a `.action()` handler fires instead of showing help.

```typescript
authCmd.action(withErrorHandling(async () => {
  // interactive selector logic
}));
```

This is distinct from subcommand actions and doesn't conflict with `notion auth login`, `notion auth logout`, `notion auth status`.

### Pattern 3: Non-TTY Guard

Same pattern as `notion init` and `notion auth login`:

```typescript
if (!process.stdin.isTTY) {
  throw new CliError(
    ErrorCodes.AUTH_NO_TOKEN,
    'Cannot run interactive auth in non-TTY mode.',
    'Use "notion auth login" for OAuth or "notion init" for integration token directly',
  );
}
```

### Anti-Patterns to Avoid

- **Merging init and login into one flow:** The internal integration token setup (validate token → save) and OAuth flow (browser/loopback server) are different enough that merging into a single function creates a complex conditional mess. Keep them as separate functions; only the entry point selector is new.
- **Removing `notion init`:** Backward compatibility matters — documented URLs, README, SKILL.md all reference `notion init`. Keep it, just stop advertising it as the primary entry point.
- **Hiding OAuth complexity:** The tradeoff display must be honest — OAuth requires a browser, has a 1-hour token expiry with auto-refresh, and requires a bundled client_id/secret. Users choosing token auth need to know they won't get user attribution.

---

## Tradeoffs to Make Explicit

This is the core of Phase 9 — the user must understand the tradeoffs before choosing. Research into each:

### Internal Integration Token

**Upsides:**
- Works anywhere (CI, Docker, headless servers, agents)
- Simple: paste token once, works forever (no expiry)
- No browser required
- Survives workspace permission changes as long as integration is connected

**Downsides:**
- Comments and pages attributed to the **integration bot** (not your user account)
- Requires user to create an integration at notion.so/profile/integrations/internal
- Must manually connect integration to each page/database (`⋯` → Add connections)
- Cannot access pages you haven't explicitly connected
- Write operations may violate "who did this" audit requirements in team settings

### OAuth User Login

**Upsides:**
- Comments and pages attributed to **your real Notion user account**
- Accesses all content your user can see (no per-page connection needed)
- Ideal for write-heavy workflows where attribution matters

**Downsides:**
- Requires browser access (or `--manual` flag for headless — more friction)
- Access tokens expire after ~1 hour (auto-refreshed transparently via refresh_token)
- Requires bundled OAuth client_id/secret — if not included in build, OAuth is unavailable
- Public integrations: Notion may limit API rate per OAuth token differently than integration tokens
- Refresh token can be revoked (e.g., user deauthorizes the app in Notion settings)
- Less suitable for fully automated agents that should never require re-auth

### Environment Variable (`NOTION_API_TOKEN`)

**Upsides:**
- Overrides all other auth — predictable for CI
- No config file needed
- Works in all environments

**Downsides:**
- Transient — must be set in every session/container
- No profile management
- Same bot-attribution limitation as internal integration token
- Must be explicitly handled in the unified `notion auth` flow (show status, not a choice)

---

## File Change Map

| File | Change |
|------|--------|
| `src/cli.ts` | Add `.action()` to `authCmd` delegating to new unified flow |
| `src/commands/auth/index.ts` (new) | `authCommand()` — interactive selector, delegates to existing login/init logic |
| `src/commands/init.ts` | Keep as-is (or reduce end-message about `notion auth login` — now redundant) |
| `README.md` | Update Authentication section: lead with `notion auth`, tradeoff table |
| `docs/README.agents.md` | Update auth section to use `notion auth` as primary entry point |
| `docs/skills/using-notion-cli/SKILL.md` | Update Setup to use `notion auth` |

**New file vs. inline in `cli.ts`:** Prefer extracting to `src/commands/auth/index.ts` for consistency with the pattern of one file per command (login.ts, logout.ts, status.ts).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive selection UI | Custom readline-based selector | `@inquirer/prompts` `select` | Already installed, supports `description` per choice, handles TTY edge cases |
| Token validation in unified flow | New validation logic | Re-use existing `validateToken()` from `notion/client.ts` | Already handles API call + error |
| OAuth flow in unified flow | New OAuth flow | Re-use existing `runOAuthFlow()` + `exchangeCode()` | Already handles browser/manual/loopback |
| Tradeoff display | Chalk formatting from scratch | `@inquirer/prompts` `select` `description` field | Displays inline below each choice |

---

## Common Pitfalls

### Pitfall 1: Commander Action vs. Help Override

**What goes wrong:** Adding `.action()` to `authCmd` after subcommands causes Commander to always run the action even when a subcommand is specified.

**Why it happens:** Commander's action on a parent command and subcommand routing are separate. If both exist, Commander routes to the subcommand when one is provided — the parent action only fires when no subcommand is given.

**How to avoid:** Test `notion auth`, `notion auth login`, `notion auth logout`, `notion auth status` all work correctly after adding action.

**Warning signs:** If subcommand tests fail or `notion auth login` triggers the selector.

### Pitfall 2: Non-TTY in the Unified Entry Point

**What goes wrong:** Running `notion auth` in a pipe/CI environment hangs waiting for input.

**Why it happens:** `@inquirer/prompts` `select` requires a TTY.

**How to avoid:** Guard with `process.stdin.isTTY` before calling `select`, same pattern as `init.ts:18-24`.

### Pitfall 3: Backward Compatibility for `notion init`

**What goes wrong:** Users with scripts or muscle memory for `notion init` break.

**Why it happens:** If `notion init` is removed or changed to redirect.

**How to avoid:** Keep `notion init` functional. Only update docs to mention `notion auth` as the preferred entry point.

### Pitfall 4: `notion auth` Without TTY Gives Poor Error

**What goes wrong:** Non-TTY users get a confusing error message from the selector.

**How to avoid:** Error message explicitly says: `Use "notion auth login" for OAuth or "notion init" for integration token`.

### Pitfall 5: `select` `description` Truncation

**What goes wrong:** Long description text gets truncated or wraps awkwardly in narrow terminals.

**Why it happens:** `@inquirer/prompts` renders description below the choice — terminal width affects display.

**How to avoid:** Keep description text concise (one line each, ~80 chars max). Core tradeoff in the choice name itself.

---

## Code Examples

### Unified Auth Entry Point Skeleton

```typescript
// src/commands/auth/index.ts
import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { withErrorHandling } from '../../errors/error-handler.js';
import { CliError } from '../../errors/cli-error.js';
import { ErrorCodes } from '../../errors/codes.js';
import { stderrWrite } from '../../output/stderr.js';

export function authDefaultAction(): (opts: unknown) => Promise<void> {
  return withErrorHandling(async () => {
    if (!process.stdin.isTTY) {
      throw new CliError(
        ErrorCodes.AUTH_NO_TOKEN,
        'Cannot run interactive auth in non-TTY mode.',
        'Use "notion auth login" for OAuth or "notion init" for integration token',
      );
    }

    const method = await select({
      message: 'How do you want to authenticate with Notion?',
      choices: [
        {
          name: 'OAuth user login  (browser required)',
          value: 'oauth' as const,
          description:
            'Opens Notion in your browser. Comments and pages are attributed to your account. Tokens auto-refresh.',
        },
        {
          name: 'Internal integration token  (CI/headless friendly)',
          value: 'token' as const,
          description:
            'Paste a token from notion.so/profile/integrations. No browser needed. Write ops attributed to integration bot.',
        },
      ],
    });

    if (method === 'oauth') {
      // Import and run login flow
      const { runOAuthFlow } = await import('../../oauth/oauth-flow.js');
      const { exchangeCode } = await import('../../oauth/oauth-client.js');
      const { saveOAuthTokens } = await import('../../oauth/token-store.js');
      const { readGlobalConfig } = await import('../../config/config.js');
      const config = await readGlobalConfig();
      const profileName = config.active_profile ?? 'default';
      const result = await runOAuthFlow();
      const response = await exchangeCode(result.code);
      await saveOAuthTokens(profileName, response);
      const userName = response.owner?.user?.name ?? 'unknown user';
      stderrWrite(`✓ Logged in as ${userName}`);
    } else {
      // Delegate to init logic (can import initCommandAction or re-run the init prompts)
      // Option A: spawn notion init (subprocess) — simpler
      // Option B: extract init logic to a shared function and call it here
    }
  });
}
```

**Implementation decision needed:** For the token path in the unified flow, there are two options:

**Option A — Subprocess:** Run `notion init` as a child process. Simple, no code sharing needed. Downside: spawning subprocess adds startup overhead, and subprocess uses `notion` binary which may not be in PATH during dev.

**Option B — Shared function:** Extract `init.ts` action body into a `runInitFlow()` function, call it from both `init.ts` and the unified auth command. Clean, no subprocess overhead, testable. This is the **recommended approach**.

### Attaching Action to Auth Command (cli.ts pattern)

```typescript
// src/cli.ts — updated auth section
import { authDefaultAction } from './commands/auth/index.js';

const authCmd = new Command('auth').description('manage Notion authentication');
authCmd.action(authDefaultAction());   // ← new: fires when no subcommand given
authCmd.addCommand(loginCommand());
authCmd.addCommand(logoutCommand());
authCmd.addCommand(statusCommand());
program.addCommand(authCmd);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `notion init` as sole auth entry | Two separate commands (`notion init`, `notion auth login`) | Users must know both exist |
| Phase 9 goal | `notion auth` as unified selector | Single discoverable entry point |

**Deprecated/outdated for docs:**
- README currently says: `notion init   # paste your Notion integration token once` at the top — this will change to `notion auth`
- Auth section in README leads with internal token — will reorder to lead with the selector

---

## Open Questions

1. **Where does `notion init` end up?**
   - What we know: Currently standalone top-level command; Phase 9 adds `notion auth` as the unified entry
   - What's unclear: Should `notion init` be deprecated, aliased under `notion auth init`, or kept as-is?
   - Recommendation: Keep `notion init` as-is for backward compatibility. Update docs only. Do NOT remove.

2. **Should `notion auth` also absorb `notion init` as a subcommand?**
   - What we know: `notion auth login/logout/status` are already under `notion auth`. `notion init` lives at the top level.
   - What's unclear: Whether `notion auth setup-token` (or similar) should be added alongside `notion init`.
   - Recommendation: Do NOT add a duplicate. The unified flow handles both paths; `notion init` stays as a direct shortcut.

3. **Tradeoff display format in the selector**
   - What we know: `@inquirer/prompts` `select` supports `description` per choice (confirmed from installed version)
   - What's unclear: Exact rendering behavior in terminals with narrow widths
   - Recommendation: Test rendering in a narrow terminal (80 cols). Keep description ≤ 80 chars.

4. **Should the unified flow skip selector if OAuth creds are already present?**
   - What we know: `notion auth status` shows current state. Users re-running `notion auth` might expect to switch methods.
   - Recommendation: Always show selector (user is explicitly re-authenticating). Add a note like "Currently: OAuth (Jane Doe)" above the selector using `notion auth status` data.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skipping this section.

---

## Sources

### Primary (HIGH confidence)

- Source code inspection: `src/commands/init.ts`, `src/commands/auth/login.ts`, `src/commands/auth/logout.ts`, `src/commands/auth/status.ts`, `src/cli.ts`, `src/config/token.ts`, `src/types/config.ts`, `src/oauth/oauth-flow.ts`, `src/oauth/oauth-client.ts`, `src/oauth/token-store.ts` — direct inspection of current implementation
- Runtime check: `node -e "import('@inquirer/prompts').then(m => console.log(Object.keys(m)))"` — confirmed `select` is exported from installed `@inquirer/prompts@^8.3.0`
- `package.json` — confirmed `@inquirer/prompts: ^8.3.0` is a production dependency

### Secondary (MEDIUM confidence)

- `README.md` and `docs/skills/using-notion-cli/SKILL.md` — current user-facing documentation for auth flow
- Commander.js behavior: parent command `.action()` fires when no subcommand given — standard Commander v14 behavior (aligned with existing project usage)

### Tertiary (LOW confidence)

- `@inquirer/prompts` `select` `description` rendering behavior in narrow terminals — not directly tested; needs validation during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies needed
- Architecture: HIGH — Commander parent-action pattern is well-understood; `select` prompt confirmed exported
- Pitfalls: HIGH — derived from direct code inspection and Commander v14 behavior
- Tradeoff analysis: HIGH — derived from direct inspection of both auth paths in the codebase

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (stable domain — Commander API + inquirer API are stable)
