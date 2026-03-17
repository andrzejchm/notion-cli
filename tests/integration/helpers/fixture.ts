/**
 * Fixture duplication and cleanup helper for integration tests.
 *
 * Uses @notionhq/client directly (no imports from src/).
 * Duplicates a fixture page or database under the test root page,
 * returning the duplicate's ID and a cleanup function that archives it.
 */

import { Client } from '@notionhq/client';
import type {
  CreateDatabaseParameters,
  CreatePageParameters,
  DatabaseObjectResponse,
  DataSourceObjectResponse,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

interface DuplicatedFixture {
  id: string;
  cleanup: () => Promise<void>;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Ensure .env.test is loaded before running integration tests.',
    );
  }
  return value;
}

function createNotionClient(): Client {
  return new Client({ auth: getRequiredEnv('NOTION_TEST_TOKEN') });
}

function getRootPageId(): string {
  return getRequiredEnv('NOTION_TEST_ROOT_PAGE_ID');
}

async function duplicatePage(
  client: Client,
  fixtureId: string,
  rootPageId: string,
): Promise<DuplicatedFixture> {
  const original = (await client.pages.retrieve({
    page_id: fixtureId,
  })) as PageObjectResponse;

  // Response types don't match request types exactly in SDK v5.
  // Cast through unknown for the shallow property copy.
  const params: CreatePageParameters = {
    parent: { type: 'page_id', page_id: rootPageId },
    properties:
      original.properties as unknown as CreatePageParameters['properties'],
  };

  const created = (await client.pages.create(params)) as PageObjectResponse;

  return {
    id: created.id,
    cleanup: async () => {
      try {
        await client.pages.update({
          page_id: created.id,
          archived: true,
        });
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: cleanup logging is intentional
        console.error(
          `[fixture cleanup] Failed to archive page ${created.id}:`,
          error,
        );
        throw error;
      }
    },
  };
}

async function duplicateDatabase(
  client: Client,
  fixtureId: string,
  rootPageId: string,
): Promise<DuplicatedFixture> {
  const original = (await client.databases.retrieve({
    database_id: fixtureId,
  })) as DatabaseObjectResponse;

  // In SDK v5, properties live on data sources, not databases.
  // Retrieve the first data source to get the property schema.
  const dataSourceRef = original.data_sources[0];
  let properties: DataSourceObjectResponse['properties'] | undefined;

  if (dataSourceRef) {
    const dataSource = (await client.dataSources.retrieve({
      data_source_id: dataSourceRef.id,
    })) as DataSourceObjectResponse;
    properties = dataSource.properties;
  }

  // Response types don't match request types exactly in SDK v5.
  // Cast through unknown for the shallow property copy.
  const params: CreateDatabaseParameters = {
    parent: { type: 'page_id', page_id: rootPageId },
    title: original.title as unknown as CreateDatabaseParameters['title'],
    ...(properties
      ? {
          initial_data_source: {
            properties: properties as unknown as NonNullable<
              CreateDatabaseParameters['initial_data_source']
            >['properties'],
          },
        }
      : {}),
  };

  const created = (await client.databases.create(
    params,
  )) as DatabaseObjectResponse;

  return {
    id: created.id,
    cleanup: async () => {
      try {
        await client.databases.update({
          database_id: created.id,
          in_trash: true,
        });
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: cleanup logging is intentional
        console.error(
          `[fixture cleanup] Failed to archive database ${created.id}:`,
          error,
        );
        throw error;
      }
    },
  };
}

/**
 * Duplicates a Notion fixture (page or database) under the test root page.
 *
 * Tries page retrieval first. If the fixture is a database (object !== 'page'),
 * falls back to database duplication.
 *
 * @param fixtureId - The ID of the fixture page or database to duplicate
 * @returns An object with the duplicate's `id` and a `cleanup` function
 */
export async function duplicateFixture(
  fixtureId: string,
): Promise<DuplicatedFixture> {
  const client = createNotionClient();
  const rootPageId = getRootPageId();

  // Determine if the fixture is a page or database by attempting page retrieval
  try {
    const page = await client.pages.retrieve({ page_id: fixtureId });
    if ('object' in page && page.object === 'page') {
      return duplicatePage(client, fixtureId, rootPageId);
    }
  } catch {
    // Not a page — try as database below
  }

  return duplicateDatabase(client, fixtureId, rootPageId);
}
