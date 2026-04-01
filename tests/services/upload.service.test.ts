import type { Client } from '@notionhq/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFileBlock,
  detectMimeType,
  resolveBlockType,
  uploadFile,
} from '../../src/services/upload.service.js';

// ──────────────────────────────────────────────────────────────────────────────
// detectMimeType
// ──────────────────────────────────────────────────────────────────────────────

describe('detectMimeType', () => {
  it('detects image/png for .png', () => {
    expect(detectMimeType('/path/to/file.png')).toBe('image/png');
  });

  it('detects image/jpeg for .jpg', () => {
    expect(detectMimeType('/path/to/file.jpg')).toBe('image/jpeg');
  });

  it('detects image/jpeg for .jpeg', () => {
    expect(detectMimeType('/path/to/file.jpeg')).toBe('image/jpeg');
  });

  it('detects image/gif for .gif', () => {
    expect(detectMimeType('/path/to/file.gif')).toBe('image/gif');
  });

  it('detects image/webp for .webp', () => {
    expect(detectMimeType('/path/to/file.webp')).toBe('image/webp');
  });

  it('detects image/svg+xml for .svg', () => {
    expect(detectMimeType('/path/to/file.svg')).toBe('image/svg+xml');
  });

  it('detects application/pdf for .pdf', () => {
    expect(detectMimeType('/path/to/file.pdf')).toBe('application/pdf');
  });

  it('detects audio/mpeg for .mp3', () => {
    expect(detectMimeType('/path/to/file.mp3')).toBe('audio/mpeg');
  });

  it('detects audio/wav for .wav', () => {
    expect(detectMimeType('/path/to/file.wav')).toBe('audio/wav');
  });

  it('detects audio/ogg for .ogg', () => {
    expect(detectMimeType('/path/to/file.ogg')).toBe('audio/ogg');
  });

  it('detects audio/mp4 for .m4a', () => {
    expect(detectMimeType('/path/to/file.m4a')).toBe('audio/mp4');
  });

  it('detects audio/flac for .flac', () => {
    expect(detectMimeType('/path/to/file.flac')).toBe('audio/flac');
  });

  it('detects audio/aac for .aac', () => {
    expect(detectMimeType('/path/to/file.aac')).toBe('audio/aac');
  });

  it('detects video/mp4 for .mp4', () => {
    expect(detectMimeType('/path/to/file.mp4')).toBe('video/mp4');
  });

  it('detects video/quicktime for .mov', () => {
    expect(detectMimeType('/path/to/file.mov')).toBe('video/quicktime');
  });

  it('detects video/x-msvideo for .avi', () => {
    expect(detectMimeType('/path/to/file.avi')).toBe('video/x-msvideo');
  });

  it('detects video/webm for .webm', () => {
    expect(detectMimeType('/path/to/file.webm')).toBe('video/webm');
  });

  it('detects video/x-matroska for .mkv', () => {
    expect(detectMimeType('/path/to/file.mkv')).toBe('video/x-matroska');
  });

  it('detects text/csv for .csv', () => {
    expect(detectMimeType('/path/to/file.csv')).toBe('text/csv');
  });

  it('detects application/json for .json', () => {
    expect(detectMimeType('/path/to/file.json')).toBe('application/json');
  });

  it('detects text/plain for .txt', () => {
    expect(detectMimeType('/path/to/file.txt')).toBe('text/plain');
  });

  it('detects text/markdown for .md', () => {
    expect(detectMimeType('/path/to/file.md')).toBe('text/markdown');
  });

  it('detects application/zip for .zip', () => {
    expect(detectMimeType('/path/to/file.zip')).toBe('application/zip');
  });

  it('detects application/vnd.openxmlformats-officedocument.wordprocessingml.document for .docx', () => {
    expect(detectMimeType('/path/to/file.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('detects application/vnd.openxmlformats-officedocument.spreadsheetml.sheet for .xlsx', () => {
    expect(detectMimeType('/path/to/file.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('falls back to application/octet-stream for unknown extension', () => {
    expect(detectMimeType('/path/to/file.xyz')).toBe(
      'application/octet-stream',
    );
  });

  it('falls back to application/octet-stream for no extension', () => {
    expect(detectMimeType('/path/to/file')).toBe('application/octet-stream');
  });

  it('is case-insensitive for extensions', () => {
    expect(detectMimeType('/path/to/file.PNG')).toBe('image/png');
    expect(detectMimeType('/path/to/file.JPG')).toBe('image/jpeg');
    expect(detectMimeType('/path/to/file.PDF')).toBe('application/pdf');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// resolveBlockType
// ──────────────────────────────────────────────────────────────────────────────

describe('resolveBlockType', () => {
  it('returns "image" for image/png', () => {
    expect(resolveBlockType('image/png')).toBe('image');
  });

  it('returns "image" for image/jpeg', () => {
    expect(resolveBlockType('image/jpeg')).toBe('image');
  });

  it('returns "image" for image/gif', () => {
    expect(resolveBlockType('image/gif')).toBe('image');
  });

  it('returns "image" for image/webp', () => {
    expect(resolveBlockType('image/webp')).toBe('image');
  });

  it('returns "image" for image/svg+xml', () => {
    expect(resolveBlockType('image/svg+xml')).toBe('image');
  });

  it('returns "audio" for audio/mpeg', () => {
    expect(resolveBlockType('audio/mpeg')).toBe('audio');
  });

  it('returns "audio" for audio/wav', () => {
    expect(resolveBlockType('audio/wav')).toBe('audio');
  });

  it('returns "audio" for audio/ogg', () => {
    expect(resolveBlockType('audio/ogg')).toBe('audio');
  });

  it('returns "audio" for audio/mp4', () => {
    expect(resolveBlockType('audio/mp4')).toBe('audio');
  });

  it('returns "video" for video/mp4', () => {
    expect(resolveBlockType('video/mp4')).toBe('video');
  });

  it('returns "video" for video/quicktime', () => {
    expect(resolveBlockType('video/quicktime')).toBe('video');
  });

  it('returns "video" for video/webm', () => {
    expect(resolveBlockType('video/webm')).toBe('video');
  });

  it('returns "pdf" for application/pdf', () => {
    expect(resolveBlockType('application/pdf')).toBe('pdf');
  });

  it('returns "file" for application/zip', () => {
    expect(resolveBlockType('application/zip')).toBe('file');
  });

  it('returns "file" for text/plain', () => {
    expect(resolveBlockType('text/plain')).toBe('file');
  });

  it('returns "file" for application/json', () => {
    expect(resolveBlockType('application/json')).toBe('file');
  });

  it('returns "file" for application/octet-stream', () => {
    expect(resolveBlockType('application/octet-stream')).toBe('file');
  });

  it('returns "file" for application/msword', () => {
    expect(resolveBlockType('application/msword')).toBe('file');
  });

  it('handles content-type with charset parameter', () => {
    expect(resolveBlockType('text/plain; charset=utf-8')).toBe('file');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildFileBlock
// ──────────────────────────────────────────────────────────────────────────────

describe('buildFileBlock', () => {
  it('builds an image block', () => {
    const block = buildFileBlock('upload-id-123', 'image');
    expect(block).toEqual({
      type: 'image',
      image: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [],
      },
    });
  });

  it('builds an audio block', () => {
    const block = buildFileBlock('upload-id-123', 'audio');
    expect(block).toEqual({
      type: 'audio',
      audio: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [],
      },
    });
  });

  it('builds a video block', () => {
    const block = buildFileBlock('upload-id-123', 'video');
    expect(block).toEqual({
      type: 'video',
      video: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [],
      },
    });
  });

  it('builds a pdf block', () => {
    const block = buildFileBlock('upload-id-123', 'pdf');
    expect(block).toEqual({
      type: 'pdf',
      pdf: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [],
      },
    });
  });

  it('builds a file block', () => {
    const block = buildFileBlock('upload-id-123', 'file');
    expect(block).toEqual({
      type: 'file',
      file: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [],
      },
    });
  });

  it('includes caption when provided', () => {
    const block = buildFileBlock('upload-id-123', 'image', 'My caption');
    expect(block).toEqual({
      type: 'image',
      image: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [{ type: 'text', text: { content: 'My caption' } }],
      },
    });
  });

  it('has empty caption when caption is undefined', () => {
    const block = buildFileBlock('upload-id-123', 'file', undefined);
    expect(block).toEqual({
      type: 'file',
      file: {
        file_upload: { id: 'upload-id-123' },
        type: 'file_upload',
        caption: [],
      },
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// uploadFile — mode selection logic
// ──────────────────────────────────────────────────────────────────────────────

describe('uploadFile', () => {
  const SMALL_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const LARGE_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB

  function createMockClient(uploadId = 'upload-id-abc') {
    return {
      fileUploads: {
        create: vi.fn().mockResolvedValue({ id: uploadId }),
        send: vi.fn().mockResolvedValue({ id: uploadId }),
        complete: vi.fn().mockResolvedValue({ id: uploadId }),
      },
    } as unknown as Client;
  }

  beforeEach(() => {
    vi.mock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        statSync: vi.fn(),
        createReadStream: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses single_part mode for files ≤20 MB', async () => {
    const { statSync, createReadStream } = await import('node:fs');
    vi.mocked(statSync).mockReturnValue({ size: SMALL_FILE_SIZE } as ReturnType<
      typeof statSync
    >);

    // Mock createReadStream to return a readable stream with data
    const mockStream = {
      on: vi.fn((event: string, handler: (data?: unknown) => void) => {
        if (event === 'data') handler(Buffer.alloc(SMALL_FILE_SIZE));
        if (event === 'end') handler();
        return mockStream;
      }),
    };
    vi.mocked(createReadStream).mockReturnValue(
      mockStream as unknown as ReturnType<typeof createReadStream>,
    );

    const client = createMockClient();
    const result = await uploadFile(client, '/path/to/small.png');

    expect(client.fileUploads.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'single_part' }),
    );
    expect(client.fileUploads.send).toHaveBeenCalledTimes(1);
    expect(client.fileUploads.complete).not.toHaveBeenCalled();
    expect(result.fileUploadId).toBe('upload-id-abc');
    expect(result.filename).toBe('small.png');
    expect(result.contentType).toBe('image/png');
  });

  it('uses multi_part mode for files >20 MB', async () => {
    const { statSync, createReadStream } = await import('node:fs');
    vi.mocked(statSync).mockReturnValue({ size: LARGE_FILE_SIZE } as ReturnType<
      typeof statSync
    >);

    // Mock createReadStream to return a readable stream with data
    const mockStream = {
      on: vi.fn((event: string, handler: (data?: unknown) => void) => {
        if (event === 'data') handler(Buffer.alloc(1024));
        if (event === 'end') handler();
        return mockStream;
      }),
    };
    vi.mocked(createReadStream).mockReturnValue(
      mockStream as unknown as ReturnType<typeof createReadStream>,
    );

    const client = createMockClient();
    await uploadFile(client, '/path/to/large.mp4');

    const expectedParts = Math.ceil(LARGE_FILE_SIZE / CHUNK_SIZE); // 2 parts
    expect(client.fileUploads.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'multi_part',
        number_of_parts: expectedParts,
      }),
    );
    expect(client.fileUploads.send).toHaveBeenCalledTimes(expectedParts);
    expect(client.fileUploads.complete).toHaveBeenCalledTimes(1);
  });

  it('calculates correct number of parts for multi-part upload', async () => {
    const { statSync, createReadStream } = await import('node:fs');
    // Exactly 3 chunks: 60 MB file
    const fileSize = 60 * 1024 * 1024;
    vi.mocked(statSync).mockReturnValue({ size: fileSize } as ReturnType<
      typeof statSync
    >);

    const mockStream = {
      on: vi.fn((event: string, handler: (data?: unknown) => void) => {
        if (event === 'data') handler(Buffer.alloc(1024));
        if (event === 'end') handler();
        return mockStream;
      }),
    };
    vi.mocked(createReadStream).mockReturnValue(
      mockStream as unknown as ReturnType<typeof createReadStream>,
    );

    const client = createMockClient();
    await uploadFile(client, '/path/to/huge.mp4');

    expect(client.fileUploads.create).toHaveBeenCalledWith(
      expect.objectContaining({ number_of_parts: 3 }),
    );
    expect(client.fileUploads.send).toHaveBeenCalledTimes(3);
  });

  it('sends correct part_number for each chunk', async () => {
    const { statSync, createReadStream } = await import('node:fs');
    vi.mocked(statSync).mockReturnValue({ size: LARGE_FILE_SIZE } as ReturnType<
      typeof statSync
    >);

    const mockStream = {
      on: vi.fn((event: string, handler: (data?: unknown) => void) => {
        if (event === 'data') handler(Buffer.alloc(1024));
        if (event === 'end') handler();
        return mockStream;
      }),
    };
    vi.mocked(createReadStream).mockReturnValue(
      mockStream as unknown as ReturnType<typeof createReadStream>,
    );

    const client = createMockClient();
    await uploadFile(client, '/path/to/large.mp4');

    const sendCalls = vi.mocked(client.fileUploads.send).mock.calls;
    expect(sendCalls[0][0]).toMatchObject({ part_number: '1' });
    expect(sendCalls[1][0]).toMatchObject({ part_number: '2' });
  });

  it('returns correct metadata for uploaded file', async () => {
    const { statSync, createReadStream } = await import('node:fs');
    vi.mocked(statSync).mockReturnValue({ size: SMALL_FILE_SIZE } as ReturnType<
      typeof statSync
    >);

    const mockStream = {
      on: vi.fn((event: string, handler: (data?: unknown) => void) => {
        if (event === 'data') handler(Buffer.alloc(SMALL_FILE_SIZE));
        if (event === 'end') handler();
        return mockStream;
      }),
    };
    vi.mocked(createReadStream).mockReturnValue(
      mockStream as unknown as ReturnType<typeof createReadStream>,
    );

    const client = createMockClient('my-upload-id');
    const result = await uploadFile(client, '/some/path/document.pdf');

    expect(result).toEqual({
      fileUploadId: 'my-upload-id',
      filename: 'document.pdf',
      contentType: 'application/pdf',
    });
  });
});
