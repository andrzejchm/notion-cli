export type OutputMode = 'auto' | 'json' | 'md';

let _mode: OutputMode = 'auto';

export function setOutputMode(mode: OutputMode): void {
  _mode = mode;
}

export function getOutputMode(): OutputMode {
  return _mode;
}

export function isatty(): boolean {
  return Boolean(process.stdout.isTTY);
}

// Derived: should we show human-readable output?
export function isHumanMode(): boolean {
  if (_mode === 'json') return false;
  if (_mode === 'md') return false; // md mode: caller decides rendering
  return isatty(); // 'auto': check TTY
}

export function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// Column width caps by header name
const COLUMN_CAPS: Record<string, number> = {
  TYPE: 8,
  TITLE: 50,
  ID: 32,
};

function getColumnCap(header: string): number {
  return COLUMN_CAPS[header.toUpperCase()] ?? Infinity;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function formatTable(rows: string[][], headers: string[]): string {
  // Calculate column widths: max of header + all rows, capped per column
  const colWidths = headers.map((header, colIdx) => {
    const cap = getColumnCap(header);
    const headerLen = header.length;
    const maxRowLen = rows.reduce((max, row) => {
      const cell = row[colIdx] ?? '';
      return Math.max(max, cell.length);
    }, 0);
    return Math.min(Math.max(headerLen, maxRowLen), cap);
  });

  const sep = '─';
  const colSep = '  ';

  // Build header row
  const headerRow = headers
    .map((h, i) => h.padEnd(colWidths[i]))
    .join(colSep);

  // Build separator row
  const separatorRow = colWidths
    .map((w) => sep.repeat(w))
    .join(colSep);

  // Build data rows
  const dataRows = rows.map((row) =>
    headers
      .map((_, i) => {
        const cell = row[i] ?? '';
        return truncate(cell, colWidths[i]).padEnd(colWidths[i]);
      })
      .join(colSep)
  );

  return [headerRow, separatorRow, ...dataRows].join('\n');
}

export function printOutput(
  data: unknown,
  tableHeaders?: string[],
  tableRows?: string[][]
): void {
  const mode = getOutputMode();
  const tty = isatty();

  if (mode === 'json' || (!tty && mode === 'auto')) {
    process.stdout.write(formatJSON(data) + '\n');
  } else if (isHumanMode() && tableHeaders && tableRows) {
    process.stdout.write(formatTable(tableRows, tableHeaders) + '\n');
  }
}
