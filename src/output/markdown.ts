import { Chalk } from 'chalk';
import { isatty } from './format.js';

// Use a Chalk instance that always produces color — we only call this when stdout is a TTY
const c = new Chalk({ level: 3 });

/**
 * Render markdown text with terminal ANSI styling.
 * Only call when stdout is a TTY — returns raw markdown otherwise.
 */
export function renderMarkdown(md: string): string {
  if (!isatty()) return md;

  const lines = md.split('\n');
  const out: string[] = [];
  let inFence = false;
  let fenceLang = '';
  let fenceLines: string[] = [];

  for (const line of lines) {
    // --- Fenced code blocks ---
    const fenceMatch = line.match(/^```(\w*)$/);
    if (fenceMatch && !inFence) {
      inFence = true;
      fenceLang = fenceMatch[1] ?? '';
      fenceLines = [];
      continue;
    }
    if (line === '```' && inFence) {
      inFence = false;
      const header = fenceLang ? c.dim(`[${fenceLang}]`) : '';
      if (header) out.push(header);
      for (const fl of fenceLines) {
        out.push(c.green(`  ${fl}`));
      }
      out.push('');
      continue;
    }
    if (inFence) {
      fenceLines.push(line);
      continue;
    }

    // --- YAML frontmatter block (--- ... ---) ---
    if (line === '---') {
      out.push(c.dim('─'.repeat(40)));
      continue;
    }

    // --- HTML comments (unsupported blocks) — suppress ---
    if (/^<!--.*-->$/.test(line.trim())) {
      continue;
    }

    // --- Headings ---
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      out.push(`\n${c.bold.cyan(h1[1])}`);
      continue;
    }

    const h2 = line.match(/^## (.+)/);
    if (h2) {
      out.push(`\n${c.bold.blue(h2[1])}`);
      continue;
    }

    const h3 = line.match(/^### (.+)/);
    if (h3) {
      out.push(`\n${c.bold(h3[1])}`);
      continue;
    }

    const h4 = line.match(/^#### (.+)/);
    if (h4) {
      out.push(c.bold.underline(h4[1]));
      continue;
    }

    // --- Blockquotes / callouts ---
    if (line.startsWith('> ')) {
      out.push(c.yellow('▎ ') + renderInline(line.slice(2)));
      continue;
    }

    // --- Horizontal rule ---
    if (line === '---') {
      out.push(c.dim('─'.repeat(40)));
      continue;
    }

    // --- Frontmatter properties (key: value) ---
    const propMatch = line.match(/^([A-Za-z_][A-Za-z0-9_ ]*): (.+)$/);
    if (propMatch) {
      out.push(c.dim(`${propMatch[1]}: `) + c.white(propMatch[2]));
      continue;
    }

    // --- Bullet list ---
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
      continue;
    }

    // --- Numbered list ---
    const numMatch = line.match(/^(\s*)(\d+)\. (.+)/);
    if (numMatch) {
      const indent = numMatch[1] ?? '';
      const num = numMatch[2] ?? '';
      const text = numMatch[3] ?? '';
      out.push(`${indent + c.cyan(`${num}.`)} ${renderInline(text)}`);
      continue;
    }

    // --- Regular paragraph ---
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
