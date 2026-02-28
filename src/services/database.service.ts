import { type Client, isFullPage } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from '@notionhq/client/build/src/api-endpoints.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { paginateResults } from '../output/paginate.js';

export interface DatabaseSchema {
  id: string;
  title: string;
  // Property configs from schema — maps prop name to its type and options
  properties: Record<string, DatabasePropertyConfig>;
}

export interface DatabasePropertyConfig {
  id: string;
  name: string;
  type: string; // 'select' | 'status' | 'number' | 'title' | 'rich_text' | 'date' | etc.
  // For select/status/multi_select: available options
  options?: Array<{ name: string; color?: string }>;
}

export interface DatabaseEntry {
  id: string;
  // Property values — maps prop name to display string
  properties: Record<string, string>;
  // Raw page object for JSON output
  raw: PageObjectResponse;
}

export interface DatabaseQueryOptions {
  filter?: QueryDataSourceParameters['filter'];
  sorts?: QueryDataSourceParameters['sorts'];
  // Subset of property names to include (undefined = all)
  columns?: string[];
}

export async function fetchDatabaseSchema(
  client: Client,
  dbId: string,
): Promise<DatabaseSchema> {
  // In Notion SDK v5, databases are exposed as "data sources"
  // client.dataSources.retrieve() returns DataSourceObjectResponse with .properties
  const ds = await client.dataSources.retrieve({ data_source_id: dbId });

  // Only full data sources have title and properties
  const title =
    'title' in ds ? ds.title.map((rt) => rt.plain_text).join('') || dbId : dbId;

  const properties: Record<string, DatabasePropertyConfig> = {};

  if ('properties' in ds) {
    for (const [name, prop] of Object.entries(ds.properties)) {
      const config: DatabasePropertyConfig = {
        id: prop.id,
        name,
        type: prop.type,
      };
      // Extract options for enumerable types
      if (prop.type === 'select' && 'select' in prop) {
        config.options = prop.select.options;
      } else if (prop.type === 'status' && 'status' in prop) {
        config.options = prop.status.options;
      } else if (prop.type === 'multi_select' && 'multi_select' in prop) {
        config.options = prop.multi_select.options;
      }
      properties[name] = config;
    }
  }

  return { id: dbId, title, properties };
}

export async function queryDatabase(
  client: Client,
  dbId: string,
  opts: DatabaseQueryOptions = {},
): Promise<DatabaseEntry[]> {
  // In Notion SDK v5, querying a database uses client.dataSources.query()
  const rawPages = await paginateResults((cursor) =>
    client.dataSources.query({
      data_source_id: dbId,
      filter: opts.filter,
      sorts: opts.sorts,
      start_cursor: cursor,
      page_size: 100,
    }),
  );

  return rawPages.filter(isFullPage).map((page) => {
    const propValues: Record<string, string> = {};
    for (const [name, prop] of Object.entries(page.properties)) {
      // Skip columns not requested (if --columns specified)
      if (opts.columns && !opts.columns.includes(name)) continue;
      propValues[name] = displayPropertyValue(prop);
    }
    return { id: page.id, properties: propValues, raw: page };
  });
}

export function buildFilter(
  filterStrings: string[],
  schema: DatabaseSchema,
): QueryDataSourceParameters['filter'] | undefined {
  if (!filterStrings.length) return undefined;

  const filters = filterStrings.map((raw) => {
    const eqIdx = raw.indexOf('=');
    if (eqIdx === -1) {
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Invalid filter syntax: "${raw}"`,
        'Use format: --filter "PropertyName=Value"',
      );
    }
    const propName = raw.slice(0, eqIdx).trim();
    const value = raw.slice(eqIdx + 1).trim();
    const propConfig = schema.properties[propName];
    if (!propConfig) {
      const available = Object.keys(schema.properties).join(', ');
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Property "${propName}" not found`,
        `Available properties: ${available}`,
      );
    }
    return buildPropertyFilter(propName, propConfig.type, value);
  });

  return filters.length === 1
    ? (filters[0] as QueryDataSourceParameters['filter'])
    : ({ and: filters } as QueryDataSourceParameters['filter']);
}

function buildPropertyFilter(
  property: string,
  type: string,
  value: string,
): object {
  switch (type) {
    case 'select':
      return { property, select: { equals: value } };
    case 'status':
      return { property, status: { equals: value } };
    case 'multi_select':
      return { property, multi_select: { contains: value } };
    case 'checkbox':
      return { property, checkbox: { equals: value.toLowerCase() === 'true' } };
    case 'number':
      return { property, number: { equals: Number(value) } };
    case 'title':
      return { property, title: { contains: value } };
    case 'rich_text':
      return { property, rich_text: { contains: value } };
    case 'url':
      return { property, url: { contains: value } };
    case 'email':
      return { property, email: { contains: value } };
    default:
      throw new CliError(
        ErrorCodes.INVALID_ARG,
        `Filtering by property type "${type}" is not supported`,
      );
  }
}

export function buildSorts(
  sortStrings: string[],
): NonNullable<QueryDataSourceParameters['sorts']> {
  return sortStrings.map((raw) => {
    const colonIdx = raw.lastIndexOf(':');
    if (colonIdx === -1) {
      return { property: raw.trim(), direction: 'ascending' as const };
    }
    const property = raw.slice(0, colonIdx).trim();
    const dir = raw
      .slice(colonIdx + 1)
      .trim()
      .toLowerCase();
    return {
      property,
      direction:
        dir === 'desc' || dir === 'descending'
          ? ('descending' as const)
          : ('ascending' as const),
    };
  });
}

type PropValue = PageObjectResponse['properties'][string];
type FormulaValue = Extract<PropValue, { type: 'formula' }>['formula'];

function displayFormula(f: FormulaValue): string {
  if (f.type === 'string') return f.string ?? '';
  if (f.type === 'number')
    return f.number !== null && f.number !== undefined ? String(f.number) : '';
  if (f.type === 'boolean') return f.boolean ? 'true' : 'false';
  if (f.type === 'date') return f.date?.start ?? '';
  return '';
}

function displayDate(
  date: { start: string; end: string | null } | null,
): string {
  if (!date) return '';
  return date.end ? `${date.start} → ${date.end}` : date.start;
}

export function displayPropertyValue(prop: PropValue): string {
  switch (prop.type) {
    case 'title':
      return prop.title
        .map((r) => r.plain_text)
        .join('')
        .replace(/\n/g, ' ');
    case 'rich_text':
      return prop.rich_text
        .map((r) => r.plain_text)
        .join('')
        .replace(/\n/g, ' ');
    case 'number':
      return prop.number !== null && prop.number !== undefined
        ? String(prop.number)
        : '';
    case 'select':
      return prop.select?.name ?? '';
    case 'status':
      return prop.status?.name ?? '';
    case 'multi_select':
      return prop.multi_select.map((s) => s.name).join(', ');
    case 'date':
      return displayDate(prop.date);
    case 'checkbox':
      return prop.checkbox ? '✓' : '✗';
    case 'url':
      return prop.url ?? '';
    case 'email':
      return prop.email ?? '';
    case 'phone_number':
      return prop.phone_number ?? '';
    case 'people':
      return prop.people
        .map((p) => ('name' in p && p.name ? p.name : p.id))
        .join(', ');
    case 'relation':
      return prop.relation.length > 0 ? `[${prop.relation.length}]` : '';
    case 'formula':
      return displayFormula(prop.formula);
    case 'created_time':
      return prop.created_time;
    case 'last_edited_time':
      return prop.last_edited_time;
    case 'unique_id':
      return prop.unique_id.prefix
        ? `${prop.unique_id.prefix}-${prop.unique_id.number}`
        : String(prop.unique_id.number ?? '');
    default:
      return '';
  }
}
