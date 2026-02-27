import type { ProfileConfig, TokenResult } from '../types/config.js';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { readGlobalConfig } from './config.js';
import { readLocalConfig } from './local-config.js';
import { refreshAccessToken } from '../oauth/oauth-client.js';
import { clearOAuthTokens, saveOAuthTokens } from '../oauth/token-store.js';

/**
 * Returns true when an OAuth access token is present but past its expiry timestamp.
 */
function isOAuthExpired(profile: ProfileConfig): boolean {
  if (profile.oauth_expiry_ms == null) return false;
  return Date.now() >= profile.oauth_expiry_ms;
}

/**
 * Attempts to resolve an OAuth access token from a profile.
 * - If oauth_access_token is present and not expired, returns it immediately.
 * - If oauth_access_token is present but expired, transparently refreshes via
 *   refreshAccessToken() and persists the new tokens before returning.
 * - If refresh fails (token revoked), clears OAuth tokens and throws AUTH_NO_TOKEN.
 * Returns null if the profile has no oauth_access_token.
 */
async function resolveOAuthToken(
  profileName: string,
  profile: ProfileConfig,
): Promise<string | null> {
  if (!profile.oauth_access_token) return null;

  if (!isOAuthExpired(profile)) {
    return profile.oauth_access_token;
  }

  // Token expired — try to refresh
  if (!profile.oauth_refresh_token) {
    await clearOAuthTokens(profileName);
    throw new CliError(
      ErrorCodes.AUTH_NO_TOKEN,
      'OAuth session expired and no refresh token is available.',
      'Run "notion auth login" to re-authenticate',
    );
  }

  try {
    const refreshed = await refreshAccessToken(profile.oauth_refresh_token);
    await saveOAuthTokens(profileName, refreshed);
    return refreshed.access_token;
  } catch {
    await clearOAuthTokens(profileName);
    throw new CliError(
      ErrorCodes.AUTH_NO_TOKEN,
      'OAuth session expired. Run "notion auth login" to re-authenticate.',
      'Your session was revoked or the refresh token has expired',
    );
  }
}

/**
 * Resolves the Notion API token using a layered lookup chain:
 *   1. NOTION_API_TOKEN environment variable
 *   2. .notion.yaml token field (direct token)
 *   3. .notion.yaml profile field → look up in global config → prefer oauth_access_token
 *      (auto-refreshes if expired); falls back to .token if no OAuth tokens
 *   4. active_profile from global config → same OAuth preference logic
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
      const profile = globalConfig.profiles?.[localConfig.profile];
      if (profile) {
        // Prefer OAuth access token over internal integration token
        const oauthToken = await resolveOAuthToken(localConfig.profile, profile);
        if (oauthToken) {
          return { token: oauthToken, source: 'oauth' };
        }
        if (profile.token) {
          return { token: profile.token, source: `profile: ${localConfig.profile}` };
        }
      }
    }
  }

  // 3. Fall back to active profile in global config
  const globalConfig = await readGlobalConfig();
  if (globalConfig.active_profile) {
    const profile = globalConfig.profiles?.[globalConfig.active_profile];
    if (profile) {
      // Prefer OAuth access token over internal integration token
      const oauthToken = await resolveOAuthToken(globalConfig.active_profile, profile);
      if (oauthToken) {
        return { token: oauthToken, source: 'oauth' };
      }
      if (profile.token) {
        return { token: profile.token, source: `profile: ${globalConfig.active_profile}` };
      }
    }
  }

  // 4. Nothing found
  throw new CliError(
    ErrorCodes.AUTH_NO_TOKEN,
    'No authentication token found.',
    'Run "notion init" to set up a profile',
  );
}
