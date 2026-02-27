import { readGlobalConfig, writeGlobalConfig } from '../config/config.js';
import type { OAuthTokenResponse } from './oauth-client.js';

// Conservative 1-hour expiry: Notion doesn't currently return expires_in for
// public integrations, so we proactively refresh after 1 hour.
const OAUTH_EXPIRY_DURATION_MS = 60 * 60 * 1000;

/**
 * Saves OAuth tokens into the named profile in global config.
 * Merges with existing profile data (preserves .token if present).
 */
export async function saveOAuthTokens(
  profileName: string,
  response: OAuthTokenResponse,
): Promise<void> {
  const config = await readGlobalConfig();
  const existing = config.profiles?.[profileName] ?? {};

  const updatedProfile = {
    ...existing,
    oauth_access_token: response.access_token,
    oauth_refresh_token: response.refresh_token,
    oauth_expiry_ms: Date.now() + OAUTH_EXPIRY_DURATION_MS,
    workspace_id: response.workspace_id,
    workspace_name: response.workspace_name,
    ...(response.owner?.user?.id != null && { oauth_user_id: response.owner.user.id }),
    ...(response.owner?.user?.name != null && { oauth_user_name: response.owner.user.name }),
  };

  config.profiles = {
    ...config.profiles,
    [profileName]: updatedProfile,
  };

  await writeGlobalConfig(config);
}

/**
 * Clears OAuth tokens from a profile (logout).
 * Leaves internal .token field intact if present.
 */
export async function clearOAuthTokens(profileName: string): Promise<void> {
  const config = await readGlobalConfig();
  const existing = config.profiles?.[profileName];
  if (!existing) return;

  const {
    oauth_access_token: _access,
    oauth_refresh_token: _refresh,
    oauth_expiry_ms: _expiry,
    oauth_user_id: _userId,
    oauth_user_name: _userName,
    ...rest
  } = existing;

  config.profiles = {
    ...config.profiles,
    [profileName]: rest,
  };

  await writeGlobalConfig(config);
}
