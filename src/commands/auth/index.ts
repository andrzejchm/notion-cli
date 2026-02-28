import type { Command } from 'commander';

/**
 * Default action for `notion auth` (no subcommand) — show help.
 */
export function authDefaultAction(authCmd: Command): () => Promise<void> {
  return async () => {
    authCmd.help();
  };
}
