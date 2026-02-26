export interface ProfileConfig {
  token: string;
  workspace_name?: string;
  workspace_id?: string;
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
  source: 'NOTION_API_TOKEN' | '.notion.yaml' | `profile: ${string}`;
}
