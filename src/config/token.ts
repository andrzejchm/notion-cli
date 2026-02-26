import type { TokenResult } from '../types/config.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { readGlobalConfig } from './config.js';
import { readLocalConfig } from './local-config.js';

/**
 * Resolves the Notion API token using a layered lookup chain:
 *   1. NOTION_API_TOKEN environment variable
 *   2. .notion.yaml token field (direct token)
 *   3. .notion.yaml profile field (look up that profile in global config)
 *   4. active_profile from global config
 *
 * Throws CliError(AUTH_NO_TOKEN) if no token is found anywhere.
 */
export async function resolveToken(): Promise<TokenResult> {
  // 1. Check env var first
  const envToken = process.env['NOTION_API_TOKEN'];
  if (envToken) {
    return { token: envToken, source: 'NOTION_API_TOKEN' };
  }

  // 2. Check .notion.yaml
  const localConfig = await readLocalConfig();

  if (localConfig !== null) {
    // 2a. Direct token in local config
    if (localConfig.token) {
      return { token: localConfig.token, source: '.notion.yaml' };
    }

    // 2b. Profile name in local config → look up in global config
    if (localConfig.profile) {
      const globalConfig = await readGlobalConfig();
      const profileToken = globalConfig.profiles?.[localConfig.profile]?.token;
      if (profileToken) {
        return { token: profileToken, source: `profile: ${localConfig.profile}` };
      }
    }
  }

  // 3. Fall back to active profile in global config
  const globalConfig = await readGlobalConfig();
  if (globalConfig.active_profile) {
    const profileToken = globalConfig.profiles?.[globalConfig.active_profile]?.token;
    if (profileToken) {
      return { token: profileToken, source: `profile: ${globalConfig.active_profile}` };
    }
  }

  // 4. Nothing found
  throw new CliError(
    ErrorCodes.AUTH_NO_TOKEN,
    'No authentication token found.',
    'Run "notion init" to set up a profile',
  );
}
