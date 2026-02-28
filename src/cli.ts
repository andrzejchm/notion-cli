import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { setColorForced } from './output/color.js';
import { withErrorHandling } from './errors/error-handler.js';
import { setOutputMode } from './output/format.js';
import { initCommand } from './commands/init.js';
import { authDefaultAction } from './commands/auth/index.js';
import { loginCommand } from './commands/auth/login.js';
import { logoutCommand } from './commands/auth/logout.js';
import { statusCommand } from './commands/auth/status.js';
import { profileListCommand } from './commands/profile/list.js';
import { profileUseCommand } from './commands/profile/use.js';
import { completionCommand } from './commands/completion.js';
import { searchCommand } from './commands/search.js';
import { lsCommand } from './commands/ls.js';
import { openCommand } from './commands/open.js';
import { usersCommand } from './commands/users.js';
import { commentsCommand } from './commands/comments.js';
import { readCommand } from './commands/read.js';
import { dbSchemaCommand } from './commands/db/schema.js';
import { dbQueryCommand } from './commands/db/query.js';
import { commentAddCommand } from './commands/comment-add.js';
import { appendCommand } from './commands/append.js';
import { createPageCommand } from './commands/create-page.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as { version: string };

const program = new Command();

program
  .name('notion')
  .description('Notion CLI — read Notion pages and databases from the terminal')
  .version(pkg.version);

program
  .option('--verbose', 'show API requests/responses')
  .option('--color', 'force color output')
  .option('--json', 'force JSON output (overrides TTY detection)')
  .option('--md', 'force markdown output for page content');

program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(str),
  outputError: (str, write) => {
    write(str);
  },
});

// Apply global options before parsing subcommands
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts<{ color?: boolean; verbose?: boolean; json?: boolean; md?: boolean }>();
  if (opts.color) {
    setColorForced(true);
  }
  if (opts.json) {
    setOutputMode('json');
  } else if (opts.md) {
    setOutputMode('md');
  }
  // else: 'auto' (default) — TTY detection in format.ts handles it
});

// --- Authentication ---
// auth subcommand group
const authCmd = new Command('auth').description('manage Notion authentication');
authCmd.action(authDefaultAction(authCmd));   // fires when no subcommand given
authCmd.addCommand(loginCommand());
authCmd.addCommand(logoutCommand());
authCmd.addCommand(statusCommand());
authCmd.addCommand(profileListCommand());
authCmd.addCommand(profileUseCommand());
program.addCommand(authCmd);

// Backward-compat aliases (hidden from help)
program.addCommand(initCommand(), { hidden: true });

const profileCmd = new Command('profile').description('manage authentication profiles');
profileCmd.addCommand(profileListCommand());
profileCmd.addCommand(profileUseCommand());
program.addCommand(profileCmd, { hidden: true });

// --- Discovery ---
program.addCommand(searchCommand());
program.addCommand(lsCommand());
program.addCommand(openCommand());
program.addCommand(usersCommand());
program.addCommand(commentsCommand());
program.addCommand(readCommand());
program.addCommand(commentAddCommand());
program.addCommand(appendCommand());
program.addCommand(createPageCommand());

// --- Database ---
const dbCmd = new Command('db').description('Database operations');
dbCmd.addCommand(dbSchemaCommand());
dbCmd.addCommand(dbQueryCommand());
program.addCommand(dbCmd);

// --- Utilities ---
program.addCommand(completionCommand());

await program.parseAsync();
