import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { parse, stringify } from 'yaml';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import type { GlobalConfig } from '../types/config.js';
import { getConfigDir, getConfigPath } from './paths.js';

/**
 * Reads the global config file.
 * Returns {} when the file doesn't exist.
 * Throws CliError(CONFIG_READ_ERROR) on YAML parse failure or other read errors.
 */
export async function readGlobalConfig(): Promise<GlobalConfig> {
  const configPath = getConfigPath();
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
    throw new CliError(
      ErrorCodes.CONFIG_READ_ERROR,
      `Failed to read config file: ${configPath}`,
      'Check file permissions or run "notion init" to create a new config',
      err,
    );
  }

  try {
    const parsed = parse(raw) as GlobalConfig;
    return parsed ?? {};
  } catch (err) {
    // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
    throw new CliError(
      ErrorCodes.CONFIG_READ_ERROR,
      `Failed to parse config file: ${configPath}`,
      'The config file may be corrupted. Delete it and run "notion init" to start fresh',
      err,
    );
  }
}

/**
 * Writes the global config file atomically.
 * Steps:
 *   1. Creates the config directory with 0o700 permissions
 *   2. Writes to a temp file (config.yaml.tmp) with 0o600 permissions
 *   3. Renames tmp to config.yaml (atomic)
 * Throws CliError(CONFIG_WRITE_ERROR) on failure.
 */
export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  const configDir = getConfigDir();
  const configPath = getConfigPath();
  const tmpPath = `${configPath}.tmp`;

  try {
    await mkdir(configDir, { recursive: true, mode: 0o700 });
  } catch (err) {
    // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
    throw new CliError(
      ErrorCodes.CONFIG_WRITE_ERROR,
      `Failed to create config directory: ${configDir}`,
      'Check that you have write permissions to your home directory',
      err,
    );
  }

  const content = stringify(config);

  try {
    await writeFile(tmpPath, content, { mode: 0o600 });
    await rename(tmpPath, configPath);
  } catch (err) {
    // biome-ignore lint/nursery/useErrorCause: cause passed as 4th positional arg to CliError
    throw new CliError(
      ErrorCodes.CONFIG_WRITE_ERROR,
      `Failed to write config file: ${configPath}`,
      'Check file permissions in the config directory',
      err,
    );
  }
}
