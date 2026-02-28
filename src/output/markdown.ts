import { Chalk } from 'chalk';
import { isatty } from './format.js';

// Use a Chalk instance that always produces color — we only call this when stdout is a TTY
const c = new Chalk({ level: 3 });

interface FenceState {
  inFence: boolean;
  fenceLang: string;
  fenceLines: string[];
}

/** Returns non-null if `line` opens or closes a fenced code block. */
function handleFenceLine(
  line: string,
  state: FenceState,
  out: string[],
): boolean {
  const fenceMatch = line.match(/^```(\w*)$/);
  if (fenceMatch && !state.inFence) {
    state.inFence = true;
    state.fenceLang = fenceMatch[1] ?? '';
    state.fenceLines = [];
    return true;
  }
  if (line === '```' && state.inFence) {
    state.inFence = false;
    const header = state.fenceLang ? c.dim(`[${state.fenceLang}]`) : '';
    if (header) out.push(header);
    for (const fl of state.fenceLines) {
      out.push(c.green(`  ${fl}`));
    }
    out.push('');
    return true;
  }
  return false;
}

function handleHeading(line: string, out: string[]): boolean {
  const h1 = line.match(/^# (.+)/);
  if (h1) {
    out.push(`\n${c.bold.cyan(h1[1])}`);
    return true;
  }
  const h2 = line.match(/^## (.+)/);
  if (h2) {
    out.push(`\n${c.bold.blue(h2[1])}`);
    return true;
  }
  const h3 = line.match(/^### (.+)/);
  if (h3) {
    out.push(`\n${c.bold(h3[1])}`);
    return true;
  }
  const h4 = line.match(/^#### (.+)/);
  if (h4) {
    out.push(c.bold.underline(h4[1]));
    return true;
  }
  return false;
}

function handleListLine(line: string, out: string[]): boolean {
  const bulletMatch = line.match(/^(\s*)- (\[[ x]\] )?(.+)/);
  if (bulletMatch) {
    const indent = bulletMatch[1] ?? '';
    const checkbox = bulletMatch[2];
    const text = bulletMatch[3] ?? '';
    if (checkbox) {
      const checked = checkbox.trim() === '[x]';
      const box = checked ? c.green('☑') : c.dim('☐');
      out.push(`${indent + box} ${renderInline(text)}`);
    } else {
      out.push(`${indent + c.cyan('•')} ${renderInline(text)}`);
    }
    return true;
  }
  const numMatch = line.match(/^(\s*)(\d+)\. (.+)/);
  if (numMatch) {
    const indent = numMatch[1] ?? '';
    const num = numMatch[2] ?? '';
    const text = numMatch[3] ?? '';
    out.push(`${indent + c.cyan(`${num}.`)} ${renderInline(text)}`);
    return true;
  }
  return false;
}

/**
 * Render markdown text with terminal ANSI styling.
 * Only call when stdout is a TTY — returns raw markdown otherwise.
 */
export function renderMarkdown(md: string): string {
  if (!isatty()) return md;

  const lines = md.split('\n');
  const out: string[] = [];
  const fence: FenceState = { inFence: false, fenceLang: '', fenceLines: [] };

  for (const line of lines) {
    if (handleFenceLine(line, fence, out)) continue;

    if (fence.inFence) {
      fence.fenceLines.push(line);
      continue;
    }

    // YAML frontmatter separator / horizontal rule
    if (line === '---') {
      out.push(c.dim('─'.repeat(40)));
      continue;
    }

    // HTML comments (unsupported blocks) — suppress
    if (/^<!--.*-->$/.test(line.trim())) continue;

    if (handleHeading(line, out)) continue;

    // Blockquotes / callouts
    if (line.startsWith('> ')) {
      out.push(c.yellow('▎ ') + renderInline(line.slice(2)));
      continue;
    }

    // Frontmatter properties (key: value)
    const propMatch = line.match(/^([A-Za-z_][A-Za-z0-9_ ]*): (.+)$/);
    if (propMatch) {
      out.push(c.dim(`${propMatch[1]}: `) + c.white(propMatch[2]));
      continue;
    }

    if (handleListLine(line, out)) continue;

    out.push(renderInline(line));
  }

  return `${out.join('\n')}\n`;
}

/** Apply inline markdown styles: bold, italic, code, strikethrough, links */
function renderInline(text: string): string {
  // Use placeholders for inline code spans so other regexes don't touch their contents
  const codeSpans: string[] = [];
  let result = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(c.green(code));
    return `\x00CODE${codeSpans.length - 1}\x00`;
  });

  result = result
    // images (before links, since ![...] would match link pattern)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt) =>
      alt ? c.dim(`[image: ${alt}]`) : c.dim('[image]'),
    )
    // links [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, t, url) => c.cyan.underline(t) + c.dim(` (${url})`),
    )
    // bold+italic
    .replace(/\*\*\*(.+?)\*\*\*/g, (_, t) => c.bold.italic(t))
    // bold
    .replace(/\*\*(.+?)\*\*/g, (_, t) => c.bold(t))
    // italic (both * and _)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, t) => c.italic(t))
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, (_, t) => c.italic(t))
    // strikethrough
    .replace(/~~(.+?)~~/g, (_, t) => c.strikethrough(t));

  // Restore code spans — \x00 is used intentionally as a sentinel character
  result = result.replace(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: sentinel chars are intentional
    /\x00CODE(\d+)\x00/g,
    (_, i) => codeSpans[Number(i)] ?? '',
  );

  return result;
}
