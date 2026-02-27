import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints.js';

export function richTextToMd(richText: RichTextItemResponse[]): string {
  return richText.map(segmentToMd).join('');
}

function segmentToMd(segment: RichTextItemResponse): string {
  if (segment.type === 'equation') {
    return `$${segment.equation.expression}$`;
  }

  if (segment.type === 'mention') {
    const text = segment.plain_text;
    return segment.href ? `[${text}](${segment.href})` : text;
  }

  // type === 'text'
  const annotated = applyAnnotations(segment.text.content, segment.annotations);
  return segment.text.link ? `[${annotated}](${segment.text.link.url})` : annotated;
}

function applyAnnotations(
  text: string,
  annotations: RichTextItemResponse['annotations']
): string {
  let result = text;

  // Apply inner-to-outer: code → strikethrough → italic → bold
  if (annotations.code) result = `\`${result}\``;
  if (annotations.strikethrough) result = `~~${result}~~`;
  if (annotations.italic) result = `_${result}_`;
  if (annotations.bold) result = `**${result}**`;

  return result;
}
