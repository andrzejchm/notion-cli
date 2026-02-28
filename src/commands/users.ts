import type { UserObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { Command } from 'commander';
import { resolveToken } from '../config/token.js';
import { withErrorHandling } from '../errors/error-handler.js';
import { createNotionClient } from '../notion/client.js';
import { printOutput, setOutputMode } from '../output/format.js';
import { paginateResults } from '../output/paginate.js';
import { reportTokenSource } from '../output/stderr.js';

function getEmailOrWorkspace(user: UserObjectResponse): string {
  if (user.type === 'person') {
    return user.person.email ?? '—';
  }
  if (user.type === 'bot') {
    const bot = user.bot as
      | { workspace_name?: string | null }
      | Record<string, never>;
    return 'workspace_name' in bot && bot.workspace_name
      ? bot.workspace_name
      : '—';
  }
  return '—';
}

export function usersCommand(): Command {
  const cmd = new Command('users');

  cmd
    .description('list all users in the workspace')
    .option('--json', 'output as JSON')
    .action(
      withErrorHandling(async (opts: { json?: boolean }) => {
        if (opts.json) setOutputMode('json');

        const { token, source } = await resolveToken();
        reportTokenSource(source);
        const notion = createNotionClient(token);

        const allUsers = await paginateResults((cursor) =>
          notion.users.list({ start_cursor: cursor }),
        );

        // Filter to full user objects (those with name field defined)
        const users = (allUsers as UserObjectResponse[]).filter(
          (u) => u.name !== undefined,
        );

        const rows = users.map((user) => [
          user.type,
          user.name ?? '(unnamed)',
          getEmailOrWorkspace(user),
          user.id,
        ]);

        printOutput(users, ['TYPE', 'NAME', 'EMAIL / WORKSPACE', 'ID'], rows);
      }),
    );

  return cmd;
}
