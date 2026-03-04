import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';

export interface PageWithMarkdown {
  page: PageObjectResponse;
  markdown: string;
}

/**
 * Fetches a page's metadata and its content as markdown using the native
 * Notion markdown endpoint (GET /v1/pages/:id/markdown).
 */
export async function fetchPageMarkdown(
  client: Client,
  pageId: string,
): Promise<PageWithMarkdown> {
  const [page, markdownResponse] = await Promise.all([
    client.pages.retrieve({ page_id: pageId }) as Promise<PageObjectResponse>,
    client.pages.retrieveMarkdown({ page_id: pageId }),
  ]);

  return { page, markdown: markdownResponse.markdown };
}
