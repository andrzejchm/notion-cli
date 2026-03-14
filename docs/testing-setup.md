# Integration Testing Setup

This guide walks through setting up a Notion workspace for running integration tests against the `notion-cli` tool.

## Prerequisites

- A Notion account (free plan works)
- Node.js >= 22
- This repository cloned locally

## 1. Create a Notion Integration

1. Go to [https://www.notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Click **"New integration"**
3. Name it `notion-cli-tests`
4. Select the workspace you want to use for testing
5. Under **Capabilities**, enable:
   - **Read content**
   - **Update content**
   - **Insert content**
   - **Read comments**
   - **Create comments**
6. Click **Save**
7. Copy the **Internal Integration Token** (starts with `ntn_`) — you'll need it later

## 2. Create Fixture Pages and Databases

Create the following structure in your Notion workspace. All fixtures live under a single root page.

### Root Page

Create a page called **`notion-cli-test-fixtures`**. This is the parent for everything below.

### Fixture Table

| Fixture | Page/DB Name | Content |
|---|---|---|
| **Rich Content Page** | `Test: Rich Content` | See [Rich Content Page details](#rich-content-page) below |
| **Simple Page** | `Test: Simple Page` | Title + a single paragraph: `"This is a simple test page with a single paragraph."` |
| **Empty Page** | `Test: Empty Page` | Title only, no body content at all |
| **Task Database** | `Test: Task Database` | See [Task Database details](#task-database) below |
| **Empty Database** | `Test: Empty Database` | Same schema as Task Database, zero rows |
| **Comments Page** | `Test: Comments Page` | See [Comments Page details](#comments-page) below |

### Rich Content Page

Create a page called `Test: Rich Content` with the following blocks (in order):

1. **Heading 1**: `Main Heading`
2. **Paragraph**: `This is a paragraph with **bold**, *italic*, and ~~strikethrough~~ text.`
3. **Heading 2**: `Sub Heading`
4. **Bulleted list** with 3 items:
   - `First item`
   - `Second item`
   - `Third item`
5. **Numbered list** with 3 items:
   1. `Step one`
   2. `Step two`
   3. `Step three`
6. **Toggle block**: Summary `Click to expand`, content `Hidden content inside toggle`
7. **Callout block**: `This is an important callout` (use any emoji icon)
8. **Code block** (language: `javascript`):
   ```javascript
   function hello() {
     return "world";
   }
   ```
9. **Table**: 3 columns × 2 data rows

   | Name | Value | Notes |
   |------|-------|-------|
   | Alpha | 1 | First entry |
   | Beta | 2 | Second entry |

10. **Child page**: `Nested Child Page` — with a single paragraph: `"Content inside nested page."`

### Task Database

Create an inline database called `Test: Task Database` with these properties:

| Property | Type | Configuration |
|---|---|---|
| **Title** | Title | (default title column) |
| **Status** | Select | Options: `Not Started`, `In Progress`, `Done` |
| **Priority** | Number | Number format: Number |
| **Due Date** | Date | — |
| **Tags** | Multi-select | Options: `bug`, `feature`, `docs`, `urgent` |

Add 5–10 rows with varied data. Example rows:

| Title | Status | Priority | Due Date | Tags |
|---|---|---|---|---|
| Fix login bug | In Progress | 1 | 2025-03-01 | bug, urgent |
| Add search feature | Not Started | 2 | 2025-04-15 | feature |
| Update README | Done | 3 | 2025-02-01 | docs |
| Refactor auth module | In Progress | 1 | 2025-03-10 | feature |
| Write API docs | Not Started | 2 | 2025-05-01 | docs |

### Empty Database

Create an inline database called `Test: Empty Database` with the **exact same schema** as the Task Database (Title, Status, Priority, Due Date, Tags) but **do not add any rows**.

### Comments Page

Create a page called `Test: Comments Page` with:

- **Body**: A single paragraph: `"This page is used to test comment retrieval."`
- **Page-level comments** (add 2–3 via the page comment area):
  1. `"First test comment"`
  2. `"Second test comment"`
  3. `"Third test comment"` (optional)
- **Inline comment**: Select the word `"comment"` in the paragraph and add a discussion comment: `"Inline comment on selected text"`

## 3. Share the Root Page with the Integration

1. Open the `notion-cli-test-fixtures` page in Notion
2. Click **"Share"** (top right) or the **"···"** menu → **"Connections"**
3. Search for `notion-cli-tests` and add it
4. Confirm the integration has access — all child pages and databases inherit the connection

## 4. Extract Page and Database IDs

Each Notion page/database has a unique ID embedded in its URL.

**From a page URL:**
```
https://www.notion.so/Your-Page-Title-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       This is the page ID (32 hex chars)
```

Format it as a UUID: `1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d`

**From a database URL:**
```
https://www.notion.so/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=...
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                       This is the database ID
```

The 32-character hex string after the last `/` (and before any `?`) is the ID. You can use it with or without dashes.

Open each fixture page/database and extract its ID.

## 5. Configure `.env.test`

Copy the example file and fill in real values:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with the IDs you extracted:

```bash
# Internal integration token (starts with ntn_)
NOTION_TEST_TOKEN=ntn_your_real_token

# Root page containing all fixtures
NOTION_TEST_ROOT_PAGE_ID=<id-of-notion-cli-test-fixtures-page>

# Rich Content Page
NOTION_FIXTURE_RICH_PAGE_ID=<id-of-test-rich-content-page>

# Simple Page
NOTION_FIXTURE_SIMPLE_PAGE_ID=<id-of-test-simple-page>

# Empty Page
NOTION_FIXTURE_EMPTY_PAGE_ID=<id-of-test-empty-page>

# Task Database
NOTION_FIXTURE_TASK_DB_ID=<id-of-test-task-database>

# Empty Database
NOTION_FIXTURE_EMPTY_DB_ID=<id-of-test-empty-database>

# Comments Page
NOTION_FIXTURE_COMMENTS_PAGE_ID=<id-of-test-comments-page>
```

### Environment Variable Reference

| Variable | Description |
|---|---|
| `NOTION_TEST_TOKEN` | Internal integration token from step 1. The test runner passes this as `NOTION_API_TOKEN` to the CLI (the env var the CLI reads for auth — see `src/config/token.ts`). |
| `NOTION_TEST_ROOT_PAGE_ID` | ID of the `notion-cli-test-fixtures` root page. Used to verify integration access. |
| `NOTION_FIXTURE_RICH_PAGE_ID` | ID of the `Test: Rich Content` page. Tests heading, list, toggle, callout, code block, table, and nested child page rendering. |
| `NOTION_FIXTURE_SIMPLE_PAGE_ID` | ID of the `Test: Simple Page` page. Tests basic page read with title and a single paragraph. |
| `NOTION_FIXTURE_EMPTY_PAGE_ID` | ID of the `Test: Empty Page` page. Tests reading a page with no body content. |
| `NOTION_FIXTURE_TASK_DB_ID` | ID of the `Test: Task Database` database. Tests database queries, filtering, sorting across multiple property types. |
| `NOTION_FIXTURE_EMPTY_DB_ID` | ID of the `Test: Empty Database` database. Tests querying a database that returns zero results. |
| `NOTION_FIXTURE_COMMENTS_PAGE_ID` | ID of the `Test: Comments Page` page. Tests reading page-level and inline comments. |

> **Important:** The CLI authenticates via the `NOTION_API_TOKEN` environment variable (not `NOTION_TOKEN`). Integration tests store the token as `NOTION_TEST_TOKEN` and the test runner helper is responsible for passing it as `NOTION_API_TOKEN` when spawning CLI processes.

## 6. Install Optional Dependencies

Install `dotenv-cli` to load `.env.test` when running tests locally:

```bash
npm install --save-dev dotenv-cli
```

This is already listed as a devDependency if you've run `npm install` after pulling this change.

## 7. Run Integration Tests

Run integration tests locally with the test environment loaded:

```bash
npx dotenv -e .env.test -- npm run test:integration
```

This command:
1. Loads variables from `.env.test` into the environment
2. Runs `vitest run --config vitest.config.integration.ts`
3. Vitest picks up test files from `tests/integration/**/*.test.ts`

If no integration test files exist yet, the command succeeds with "no test suites found" (the vitest config uses `passWithNoTests` behavior by default).

### Troubleshooting

| Problem | Solution |
|---|---|
| `Script "test:integration" not found` | Run `npm install` to refresh scripts |
| `401 Unauthorized` from Notion API | Verify `NOTION_TEST_TOKEN` is correct and the integration is still active |
| `404 Not Found` for a fixture | Verify the page/database ID is correct and the root page is shared with the integration |
| Tests time out | Default timeout is 30s per test. Check your network connection. |
| `NOTION_API_TOKEN` not set errors | Make sure you're using `npx dotenv -e .env.test --` before the npm command |

## CI Configuration

Integration tests run automatically on **pull requests** via the `integration` job in `.github/workflows/ci.yml`. They do not run on push events, so pushes to `main` are never blocked by integration test failures.

The job depends on the `ci` job (typecheck, lint, unit tests) passing first, then builds the CLI and runs `npm run test:integration`.

### Required GitHub Actions Secrets

Configure these secrets in your repository under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `NOTION_TEST_TOKEN` | Internal integration token (starts with `ntn_`) |
| `NOTION_TEST_ROOT_PAGE_ID` | ID of the `notion-cli-test-fixtures` root page |
| `NOTION_FIXTURE_RICH_PAGE_ID` | ID of the `Test: Rich Content` page |
| `NOTION_FIXTURE_SIMPLE_PAGE_ID` | ID of the `Test: Simple Page` page |
| `NOTION_FIXTURE_EMPTY_PAGE_ID` | ID of the `Test: Empty Page` page |
| `NOTION_FIXTURE_TASK_DB_ID` | ID of the `Test: Task Database` database |
| `NOTION_FIXTURE_EMPTY_DB_ID` | ID of the `Test: Empty Database` database |
| `NOTION_FIXTURE_COMMENTS_PAGE_ID` | ID of the `Test: Comments Page` page |

These are the same values from your `.env.test` file (see [section 5](#5-configure-envtest) above). Each secret maps to the corresponding environment variable that the test runner expects.
