import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { setColorForced } from './output/color.js';
import { withErrorHandling } from './errors/error-handler.js';
import { initCommand } from './commands/init.js';
import { profileListCommand } from './commands/profile/list.js';
import { profileUseCommand } from './commands/profile/use.js';
import { profileRemoveCommand } from './commands/profile/remove.js';
import { completionCommand } from './commands/completion.js';

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
  .option('--color', 'force color output');

program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(str),
  outputError: (str, write) => {
    write(str);
  },
});

// Apply global options before parsing subcommands
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts<{ color?: boolean; verbose?: boolean }>();
  if (opts.color) {
    setColorForced(true);
  }
});

// --- Authentication ---
program.addCommand(initCommand());

// --- Profile Management ---
const profileCmd = new Command('profile')
  .description('manage authentication profiles');

profileCmd.addCommand(profileListCommand());
profileCmd.addCommand(profileUseCommand());
profileCmd.addCommand(profileRemoveCommand());

program.addCommand(profileCmd);

// --- Utilities ---
program.addCommand(completionCommand());

await program.parseAsync();
