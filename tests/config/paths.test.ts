import { homedir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getConfigDir, getConfigPath } from '../../src/config/paths.js';

describe('getConfigDir', () => {
  const originalXdg = process.env.XDG_CONFIG_HOME;

  afterEach(() => {
    // Restore env
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
  });

  it('returns XDG_CONFIG_HOME-based path when env var is set', () => {
    process.env.XDG_CONFIG_HOME = '/custom/xdg';
    expect(getConfigDir()).toBe('/custom/xdg/notion-cli');
  });

  it('falls back to ~/.config/notion-cli when XDG_CONFIG_HOME is not set', () => {
    delete process.env.XDG_CONFIG_HOME;
    expect(getConfigDir()).toBe(join(homedir(), '.config', 'notion-cli'));
  });

  it('getConfigPath appends config.yaml to config dir', () => {
    delete process.env.XDG_CONFIG_HOME;
    expect(getConfigPath()).toBe(join(getConfigDir(), 'config.yaml'));
  });

  it('getConfigPath uses XDG_CONFIG_HOME when set', () => {
    process.env.XDG_CONFIG_HOME = '/my/xdg';
    expect(getConfigPath()).toBe('/my/xdg/notion-cli/config.yaml');
  });
});

describe('getConfigDir', () => {
  it('is deterministic for the same env', () => {
    const dir1 = getConfigDir();
    const dir2 = getConfigDir();
    expect(dir1).toBe(dir2);
  });
});
