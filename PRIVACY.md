# Privacy Policy

**notion-cli** is an open-source command-line tool. This policy describes what data is handled and how.

## Data we collect

We collect nothing. notion-cli has no servers, no analytics, no telemetry.

## Data stored locally

When you run `notion auth login`, notion-cli stores the following on your local machine only (in `~/.config/notion-cli/config.yaml` or equivalent):

- Your Notion OAuth access token and refresh token
- Your Notion workspace name and ID
- Your Notion user ID and display name

This data never leaves your machine except as bearer tokens sent directly to `api.notion.com` to authenticate your requests.

## Third-party services

notion-cli communicates only with:

- **`api.notion.com`** — Notion's official API, to execute the commands you run
- **`mcp.notion.com`** — Notion's OAuth server, during the `notion auth login` flow only

Notion's own privacy policy applies to data sent to their API: https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091

## OAuth credentials

The OAuth `client_id` and `client_secret` bundled in notion-cli identify the application to Notion's OAuth server. They are not user credentials and do not grant access to any user's data on their own.

## Open source

The full source code is available at https://github.com/andrzejchm/notion-cli. You can verify exactly what the tool does.

## Contact

Questions: open an issue at https://github.com/andrzejchm/notion-cli/issues
