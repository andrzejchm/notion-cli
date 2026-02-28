import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import type { LocalConfig } from '../types/config.js';

/**
 * Reads the local .notion.yaml file from the current working directory.
 * Returns null if the file doesn't exist.
 * Throws CliError(CONFIG_INVALID) if both `profile` and `token` are specified.
 */
export async function readLocalConfig(): Promise<LocalConfig | null> {
  const localConfigPath = join(process.cwd(), '.notion.yaml');
  let raw: string;

  try {
    raw = await readFile(localConfigPath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw new CliError(
      ErrorCodes.CONFIG_READ_ERROR,
      `Failed to read local config: ${localConfigPath}`,
      'Check file permissions',
    );
  }

  let parsed: LocalConfig;
  try {
    parsed = (parse(raw) as LocalConfig) ?? {};
  } catch {
    throw new CliError(
      ErrorCodes.CONFIG_INVALID,
      `Failed to parse .notion.yaml`,
      'Check that the file contains valid YAML',
    );
  }

  if (parsed.profile !== undefined && parsed.token !== undefined) {
    throw new CliError(
      ErrorCodes.CONFIG_INVALID,
      '.notion.yaml cannot specify both "profile" and "token"',
      'Use either "profile: <name>" to reference a saved profile, or "token: <value>" for a direct token',
    );
  }

  return parsed;
}
