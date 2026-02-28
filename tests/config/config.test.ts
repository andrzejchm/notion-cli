import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to control the paths module so we can redirect to temp dirs
vi.mock('../../src/config/paths.js', () => ({
  getConfigDir: vi.fn(),
  getConfigPath: vi.fn(),
}));

import {
  readGlobalConfig,
  writeGlobalConfig,
} from '../../src/config/config.js';
import { getConfigDir, getConfigPath } from '../../src/config/paths.js';

const mockGetConfigDir = vi.mocked(getConfigDir);
const mockGetConfigPath = vi.mocked(getConfigPath);

describe('readGlobalConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'notion-cli-test-'));
    const configPath = join(tmpDir, 'config.yaml');
    mockGetConfigDir.mockReturnValue(tmpDir);
    mockGetConfigPath.mockReturnValue(configPath);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('returns empty object when config file does not exist', async () => {
    const config = await readGlobalConfig();
    expect(config).toEqual({});
  });

  it('parses a valid YAML config file', async () => {
    const configPath = join(tmpDir, 'config.yaml');
    await writeFile(
      configPath,
      'active_profile: work\nprofiles:\n  work:\n    token: secret\n',
    );
    const config = await readGlobalConfig();
    expect(config.active_profile).toBe('work');
    expect(config.profiles?.work?.token).toBe('secret');
  });

  it('throws CONFIG_READ_ERROR on invalid YAML', async () => {
    const configPath = join(tmpDir, 'config.yaml');
    await writeFile(configPath, '{ invalid: yaml: content: [}');
    await expect(readGlobalConfig()).rejects.toMatchObject({
      code: 'CONFIG_READ_ERROR',
    });
  });
});

describe('writeGlobalConfig + readGlobalConfig round-trip', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'notion-cli-test-'));
    const configPath = join(tmpDir, 'config.yaml');
    mockGetConfigDir.mockReturnValue(tmpDir);
    mockGetConfigPath.mockReturnValue(configPath);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('writes and reads back config correctly', async () => {
    const config = {
      active_profile: 'personal',
      profiles: {
        personal: { token: 'my-token' },
      },
    };
    await writeGlobalConfig(config);
    const result = await readGlobalConfig();
    expect(result.active_profile).toBe('personal');
    expect(result.profiles?.personal?.token).toBe('my-token');
  });

  it('writes file with 0600 permissions', async () => {
    await writeGlobalConfig({ active_profile: 'test', profiles: {} });
    const configPath = join(tmpDir, 'config.yaml');
    const fileStat = await stat(configPath);
    // Mode masked to permission bits: 0o600 = 384
    expect(fileStat.mode & 0o777).toBe(0o600);
  });
});

describe('readLocalConfig', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'notion-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tmpDir, { recursive: true });
  });

  it('returns null when .notion.yaml does not exist', async () => {
    const { readLocalConfig } = await import(
      '../../src/config/local-config.js'
    );
    const result = await readLocalConfig();
    expect(result).toBeNull();
  });
});
