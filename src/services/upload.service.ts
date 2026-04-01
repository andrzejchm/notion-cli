import { createReadStream, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import type { Client } from '@notionhq/client';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints.js';

const MULTI_PART_THRESHOLD = 20 * 1024 * 1024; // 20 MB
const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB per part

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.heic': 'image/heic',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export interface UploadResult {
  fileUploadId: string;
  filename: string;
  contentType: string;
}

/**
 * Detects MIME type from file extension using the built-in map.
 * Falls back to 'application/octet-stream' for unknown extensions.
 */
export function detectMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

/**
 * Maps a MIME type to the appropriate Notion block type.
 */
export function resolveBlockType(
  contentType: string,
): 'image' | 'file' | 'pdf' | 'audio' | 'video' {
  const base = contentType.split(';')[0].trim().toLowerCase();

  if (base.startsWith('image/')) return 'image';
  if (base.startsWith('audio/')) return 'audio';
  if (base.startsWith('video/')) return 'video';
  if (base === 'application/pdf') return 'pdf';
  return 'file';
}

/**
 * Reads a stream chunk into a Buffer.
 */
async function readStreamChunk(
  filePath: string,
  start: number,
  end: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = createReadStream(filePath, { start, end });
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Uploads a local file to Notion using single-part mode (≤20 MB).
 */
async function uploadSinglePart(
  client: Client,
  filePath: string,
  filename: string,
  contentType: string,
  fileSize: number,
): Promise<string> {
  const upload = await client.fileUploads.create({
    mode: 'single_part',
    filename,
    content_type: contentType,
  });

  const data = await readStreamChunk(filePath, 0, fileSize - 1);
  const blob = new Blob([data.buffer as ArrayBuffer], { type: contentType });

  await client.fileUploads.send({
    file_upload_id: upload.id,
    file: { data: blob, filename },
  });

  return upload.id;
}

/**
 * Uploads a local file to Notion using multi-part mode (>20 MB).
 */
async function uploadMultiPart(
  client: Client,
  filePath: string,
  filename: string,
  contentType: string,
  fileSize: number,
): Promise<string> {
  const numberOfParts = Math.ceil(fileSize / CHUNK_SIZE);

  const upload = await client.fileUploads.create({
    mode: 'multi_part',
    filename,
    content_type: contentType,
    number_of_parts: numberOfParts,
  });

  for (let part = 0; part < numberOfParts; part++) {
    const start = part * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize) - 1;
    const data = await readStreamChunk(filePath, start, end);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: contentType });

    await client.fileUploads.send({
      file_upload_id: upload.id,
      file: { data: blob, filename },
      part_number: String(part + 1),
    });
  }

  await client.fileUploads.complete({ file_upload_id: upload.id });

  return upload.id;
}

/**
 * Uploads a local file to Notion.
 * Uses single-part mode for files ≤20 MB, multi-part for larger files.
 * Returns the file upload ID and metadata.
 */
export async function uploadFile(
  client: Client,
  filePath: string,
): Promise<UploadResult> {
  const filename = basename(filePath);
  const contentType = detectMimeType(filePath);
  const { size: fileSize } = statSync(filePath);

  const fileUploadId =
    fileSize <= MULTI_PART_THRESHOLD
      ? await uploadSinglePart(
          client,
          filePath,
          filename,
          contentType,
          fileSize,
        )
      : await uploadMultiPart(
          client,
          filePath,
          filename,
          contentType,
          fileSize,
        );

  return { fileUploadId, filename, contentType };
}

/**
 * Builds a Notion BlockObjectRequest for a file upload.
 */
export function buildFileBlock(
  fileUploadId: string,
  blockType: 'image' | 'file' | 'pdf' | 'audio' | 'video',
  caption?: string,
): BlockObjectRequest {
  const captionRichText = caption
    ? [{ type: 'text' as const, text: { content: caption } }]
    : [];

  const fileContent = {
    file_upload: { id: fileUploadId },
    type: 'file_upload' as const,
    caption: captionRichText,
  };

  switch (blockType) {
    case 'image':
      return { type: 'image', image: fileContent };
    case 'audio':
      return { type: 'audio', audio: fileContent };
    case 'video':
      return { type: 'video', video: fileContent };
    case 'pdf':
      return { type: 'pdf', pdf: fileContent };
    case 'file':
      return { type: 'file', file: fileContent };
  }
}
