import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';

type PropertyValue = PageObjectResponse['properties'][string];

type FormulaValue = Extract<PropertyValue, { type: 'formula' }>['formula'];
type RollupValue = Extract<PropertyValue, { type: 'rollup' }>['rollup'];
type UserValue = Extract<PropertyValue, { type: 'people' }>['people'][number];

function formatFormula(f: FormulaValue): string {
  if (f.type === 'string') return f.string ?? '';
  if (f.type === 'number') return f.number !== null ? String(f.number) : '';
  if (f.type === 'boolean') return String(f.boolean);
  if (f.type === 'date') return f.date?.start ?? '';
  return '';
}

function formatRollup(r: RollupValue): string {
  if (r.type === 'number') return r.number !== null ? String(r.number) : '';
  if (r.type === 'date') return r.date?.start ?? '';
  if (r.type === 'array') return `[${r.array.length} items]`;
  return '';
}

function formatUser(p: UserValue): string {
  return 'name' in p && p.name ? p.name : p.id;
}

export function formatPropertyValue(
  _name: string,
  prop: PropertyValue,
): string {
  switch (prop.type) {
    case 'title':
      return prop.title.map((rt) => rt.plain_text).join('');
    case 'rich_text':
      return prop.rich_text.map((rt) => rt.plain_text).join('');
    case 'number':
      return prop.number !== null ? String(prop.number) : '';
    case 'select':
      return prop.select?.name ?? '';
    case 'status':
      return prop.status?.name ?? '';
    case 'multi_select':
      return prop.multi_select.map((s) => s.name).join(', ');
    case 'date':
      if (!prop.date) return '';
      return prop.date.end
        ? `${prop.date.start} → ${prop.date.end}`
        : prop.date.start;
    case 'checkbox':
      return prop.checkbox ? 'true' : 'false';
    case 'url':
      return prop.url ?? '';
    case 'email':
      return prop.email ?? '';
    case 'phone_number':
      return prop.phone_number ?? '';
    case 'people':
      return prop.people.map(formatUser).join(', ');
    case 'relation':
      return prop.relation.map((r) => r.id).join(', ');
    case 'formula':
      return formatFormula(prop.formula);
    case 'rollup':
      return formatRollup(prop.rollup);
    case 'created_time':
      return prop.created_time;
    case 'last_edited_time':
      return prop.last_edited_time;
    case 'created_by':
      return 'name' in prop.created_by
        ? (prop.created_by.name ?? prop.created_by.id)
        : prop.created_by.id;
    case 'last_edited_by':
      return 'name' in prop.last_edited_by
        ? (prop.last_edited_by.name ?? prop.last_edited_by.id)
        : prop.last_edited_by.id;
    case 'files':
      return prop.files
        .map((f) => (f.type === 'external' ? f.external.url : f.name))
        .join(', ');
    case 'unique_id':
      return prop.unique_id.prefix
        ? `${prop.unique_id.prefix}-${prop.unique_id.number}`
        : String(prop.unique_id.number ?? '');
    default:
      return '';
  }
}

export function extractPageTitle(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find(
    (p) => p.type === 'title',
  );
  if (!titleProp || titleProp.type !== 'title') return page.id;
  return titleProp.title.map((rt) => rt.plain_text).join('') || page.id;
}
