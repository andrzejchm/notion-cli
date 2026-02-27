export async function paginateResults<T>(
  fetcher: (cursor?: string) => Promise<{ results: T[]; next_cursor: string | null; has_more: boolean }>
): Promise<T[]> {
  const allResults: T[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await fetcher(cursor);
    allResults.push(...response.results);
    cursor = response.next_cursor ?? undefined;
    hasMore = response.has_more;
  }

  return allResults;
}
