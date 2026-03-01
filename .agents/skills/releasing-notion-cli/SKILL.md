---
name: releasing-notion-cli
description: Publishes a new version of notion-cli to npm and updates the Homebrew tap. Use when releasing a new version, bumping the version number, or verifying a release went through.
---

## Versioning Rules

| Change type | Version bump |
|-------------|-------------|
| Bug fix, no behavior change | patch (0.x.Y) |
| New feature, backward compatible | minor (0.X.0) |
| Breaking change (removed command, config format change) | major (X.0.0) |

Never release after a single change. Accumulate related changes, confirm they work locally, then release.

## Pre-release checklist

- [ ] Changes tested locally (`npm install -g .` from repo root)
- [ ] `npm run ci` passes (typecheck + biome check)
- [ ] `npm run test` passes
- [ ] SKILL.md in `docs/skills/using-notion-cli/` is up to date with new commands/behavior

## Release steps

### 1. Bump version

```bash
npm version patch --no-git-tag-version   # or minor / major
```

This updates `package.json` and `package-lock.json` only — no git tag yet.

### 2. Commit and tag

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to X.Y.Z"
git tag vX.Y.Z
git push && git push origin vX.Y.Z
```

The `v*` tag triggers the publish workflow (`.github/workflows/publish.yml`):
- Runs CI (typecheck + biome check + tests)
- Builds and publishes to npm on success

### 3. Verify publish and release

```bash
gh run watch $(gh run list --repo andrzejchm/notion-cli --limit 1 --json databaseId --jq '.[0].databaseId') --repo andrzejchm/notion-cli
```

Wait for both jobs (`Typecheck, lint & test` and `Publish to npm`) to show ✓.

The workflow also auto-creates a GitHub release with a changelog grouped by commit type (feat/fix/perf/refactor/docs/chore). Commit messages must follow conventional commits (`type: message` or `type(scope): message`) for correct grouping.

Verify the release was created:
```bash
gh release view vX.Y.Z --repo andrzejchm/notion-cli
```

### 4. Update Homebrew tap

```bash
gh workflow run "Update Formula" --repo andrzejchm/homebrew-notion-cli
sleep 20
git -C /Users/andrzejchm/Developer/homebrew-notion-cli pull
grep 'url' /Users/andrzejchm/Developer/homebrew-notion-cli/Formula/notion-cli.rb
```

The workflow reads the npm `latest` tag and updates the formula. If it ran before npm propagated, run it again.

## If CI fails after tagging

Fix the issue on `main`, then move the tag:

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag vX.Y.Z
git push origin vX.Y.Z
```

## Local install for testing (no release)

```bash
npm install -g .
notion --version
```

Uninstall after testing:

```bash
npm uninstall -g @andrzejchm/notion-cli
brew install notion-cli   # back to released version
```
