export interface ProfileConfig {
  token?: string; // internal integration token (optional — not all profiles have one)
  workspace_name?: string;
  workspace_id?: string;
  oauth_access_token?: string; // OAuth user-attributed access token
  oauth_refresh_token?: string; // OAuth refresh token (used to renew access token)
  oauth_expiry_ms?: number; // Unix timestamp ms when access_token expires
  oauth_user_id?: string; // Notion user ID for display
  oauth_user_name?: string; // Notion user name for display
}

export interface GlobalConfig {
  active_profile?: string;
  profiles?: Record<string, ProfileConfig>;
}

export interface LocalConfig {
  profile?: string;
  token?: string;
}

export interface TokenResult {
  token: string;
  source: 'NOTION_API_TOKEN' | '.notion.yaml' | `profile: ${string}` | 'oauth';
}
