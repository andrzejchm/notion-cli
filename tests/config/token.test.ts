import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config modules so tests are fully isolated
vi.mock('../../src/config/config.js', () => ({
  readGlobalConfig: vi.fn(),
}));

vi.mock('../../src/config/local-config.js', () => ({
  readLocalConfig: vi.fn(),
}));

import { readGlobalConfig } from '../../src/config/config.js';
import { readLocalConfig } from '../../src/config/local-config.js';
import { resolveToken } from '../../src/config/token.js';

const mockReadGlobalConfig = vi.mocked(readGlobalConfig);
const mockReadLocalConfig = vi.mocked(readLocalConfig);

describe('resolveToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Default: no local config, empty global config
    mockReadLocalConfig.mockResolvedValue(null);
    mockReadGlobalConfig.mockResolvedValue({});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('returns env token with NOTION_API_TOKEN source when env var is set', async () => {
    process.env['NOTION_API_TOKEN'] = 'env-token-123';
    const result = await resolveToken();
    expect(result).toEqual({ token: 'env-token-123', source: 'NOTION_API_TOKEN' });
    // Should not read any config files
    expect(mockReadLocalConfig).not.toHaveBeenCalled();
    expect(mockReadGlobalConfig).not.toHaveBeenCalled();
  });

  it('returns token from .notion.yaml with .notion.yaml source', async () => {
    delete process.env['NOTION_API_TOKEN'];
    mockReadLocalConfig.mockResolvedValue({ token: 'local-token-456' });
    const result = await resolveToken();
    expect(result).toEqual({ token: 'local-token-456', source: '.notion.yaml' });
  });

  it('resolves profile from .notion.yaml profile field', async () => {
    delete process.env['NOTION_API_TOKEN'];
    mockReadLocalConfig.mockResolvedValue({ profile: 'work' });
    mockReadGlobalConfig.mockResolvedValue({
      profiles: { work: { token: 'work-token-789' } },
    });
    const result = await resolveToken();
    expect(result).toEqual({ token: 'work-token-789', source: 'profile: work' });
  });

  it('falls back to active_profile from global config', async () => {
    delete process.env['NOTION_API_TOKEN'];
    mockReadLocalConfig.mockResolvedValue(null);
    mockReadGlobalConfig.mockResolvedValue({
      active_profile: 'personal',
      profiles: { personal: { token: 'personal-token' } },
    });
    const result = await resolveToken();
    expect(result).toEqual({ token: 'personal-token', source: 'profile: personal' });
  });

  it('throws AUTH_NO_TOKEN when no token found anywhere', async () => {
    delete process.env['NOTION_API_TOKEN'];
    mockReadLocalConfig.mockResolvedValue(null);
    mockReadGlobalConfig.mockResolvedValue({});
    await expect(resolveToken()).rejects.toMatchObject({
      code: 'AUTH_NO_TOKEN',
      message: 'No authentication token found.',
    });
  });

  it('env var takes precedence over .notion.yaml token', async () => {
    process.env['NOTION_API_TOKEN'] = 'env-wins';
    mockReadLocalConfig.mockResolvedValue({ token: 'local-token' });
    const result = await resolveToken();
    expect(result.source).toBe('NOTION_API_TOKEN');
    expect(result.token).toBe('env-wins');
  });

  it('env var takes precedence over active_profile', async () => {
    process.env['NOTION_API_TOKEN'] = 'env-wins-again';
    mockReadGlobalConfig.mockResolvedValue({
      active_profile: 'work',
      profiles: { work: { token: 'work-token' } },
    });
    const result = await resolveToken();
    expect(result.source).toBe('NOTION_API_TOKEN');
    expect(result.token).toBe('env-wins-again');
  });

  it('.notion.yaml token takes precedence over active_profile', async () => {
    delete process.env['NOTION_API_TOKEN'];
    mockReadLocalConfig.mockResolvedValue({ token: 'local-token' });
    mockReadGlobalConfig.mockResolvedValue({
      active_profile: 'work',
      profiles: { work: { token: 'work-token' } },
    });
    const result = await resolveToken();
    expect(result.source).toBe('.notion.yaml');
    expect(result.token).toBe('local-token');
  });

  it('throws AUTH_NO_TOKEN when .notion.yaml profile not found in global config', async () => {
    delete process.env['NOTION_API_TOKEN'];
    mockReadLocalConfig.mockResolvedValue({ profile: 'nonexistent' });
    mockReadGlobalConfig.mockResolvedValue({
      profiles: { other: { token: 'other-token' } },
    });
    await expect(resolveToken()).rejects.toMatchObject({
      code: 'AUTH_NO_TOKEN',
    });
  });
});
