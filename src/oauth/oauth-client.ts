import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';

// OAuth credentials are injected at build time via tsup `define` from env vars:
//   NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_CLIENT_SECRET
// They are never stored in source control. Locally, set them in .env before building.
// In GitHub Actions, they are stored as repository secrets.
declare const __OAUTH_CLIENT_ID__: string;
declare const __OAUTH_CLIENT_SECRET__: string;

const OAUTH_CLIENT_ID: string = __OAUTH_CLIENT_ID__;
const OAUTH_CLIENT_SECRET: string = __OAUTH_CLIENT_SECRET__;

export const OAUTH_REDIRECT_URI = 'http://localhost:54321/oauth/callback';

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  bot_id: string;
  workspace_id: string;
  workspace_name: string;
  owner?: {
    type: string;
    user?: { id: string; name?: string };
  };
}

/**
 * Returns the Notion OAuth authorization URL.
 * state: random hex string to prevent CSRF.
 */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: 'code',
    owner: 'user',
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

function basicAuth(): string {
  return Buffer.from(`${OAUTH_CLIENT_ID}:${OAUTH_CLIENT_SECRET}`).toString('base64');
}

/**
 * Exchanges an authorization code for access_token + refresh_token.
 * Throws CliError(AUTH_INVALID) on failure.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string = OAUTH_REDIRECT_URI,
): Promise<OAuthTokenResponse> {
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth()}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    let errorMessage = `OAuth token exchange failed (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as { error?: string; error_description?: string };
      if (body.error_description) errorMessage = body.error_description;
      else if (body.error) errorMessage = body.error;
    } catch {
      // Ignore JSON parse errors — use generic message
    }
    throw new CliError(
      ErrorCodes.AUTH_INVALID,
      errorMessage,
      'Run "notion auth login" to restart the OAuth flow',
    );
  }

  const data = (await response.json()) as OAuthTokenResponse;
  return data;
}

/**
 * Refreshes an expired access_token using the stored refresh_token.
 * Returns new OAuthTokenResponse on success.
 * Throws CliError(AUTH_INVALID) if refresh fails (token revoked).
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth()}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    let errorMessage = `OAuth token refresh failed (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as { error?: string; error_description?: string };
      if (body.error_description) errorMessage = body.error_description;
      else if (body.error) errorMessage = body.error;
    } catch {
      // Ignore JSON parse errors — use generic message
    }
    throw new CliError(
      ErrorCodes.AUTH_INVALID,
      errorMessage,
      'Run "notion auth login" to re-authenticate',
    );
  }

  const data = (await response.json()) as OAuthTokenResponse;
  return data;
}
