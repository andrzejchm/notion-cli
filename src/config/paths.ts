import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Returns the XDG-aware config directory for notion-cli.
 * Uses $XDG_CONFIG_HOME if set, otherwise falls back to ~/.config/notion-cli.
 */
export function getConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const base = xdgConfigHome ? xdgConfigHome : join(homedir(), '.config');
  return join(base, 'notion-cli');
}

/**
 * Returns the full path to the global config file.
 * Path: <configDir>/config.yaml
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.yaml');
}
