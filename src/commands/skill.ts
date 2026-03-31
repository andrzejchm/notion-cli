import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { withErrorHandling } from '../errors/error-handler.js';

function skillPath(): string {
  if (!process.argv[1]) {
    throw new Error('Cannot determine install path. Run with: notion skill');
  }
  const entryPoint = realpathSync(process.argv[1]);
  const packageRoot = dirname(dirname(entryPoint));
  const candidates = [
    join(packageRoot, '.agents', 'skills', 'using-notion-cli', 'SKILL.md'),
    join(
      dirname(entryPoint),
      '..',
      '.agents',
      'skills',
      'using-notion-cli',
      'SKILL.md',
    ),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    'SKILL.md not found. Reinstall with: npm install -g @andrzejchm/notion-cli',
  );
}

interface AgentTarget {
  name: string;
  dir: string;
  detected: boolean;
}

function getAgentTargets(): AgentTarget[] {
  const home = homedir();
  const targets = [
    {
      name: 'Claude Code',
      dir: join(home, '.claude', 'skills', 'using-notion-cli'),
    },
    { name: 'Codex', dir: join(home, '.agents', 'skills', 'using-notion-cli') },
    {
      name: 'OpenCode',
      dir: join(home, '.config', 'opencode', 'skills', 'using-notion-cli'),
    },
  ];
  return targets.map((t) => ({
    ...t,
    detected: existsSync(dirname(t.dir)),
  }));
}

function installTo(source: string, target: AgentTarget): string {
  if (!existsSync(target.dir)) mkdirSync(target.dir, { recursive: true });
  const dest = join(target.dir, 'SKILL.md');
  copyFileSync(source, dest);
  return dest;
}

async function installInteractive(
  source: string,
  targets: AgentTarget[],
): Promise<void> {
  const { checkbox } = await import('@inquirer/prompts');
  const selected = await checkbox<string>({
    message: 'Install skill for which agents?',
    choices: targets.map((t) => ({
      name: `${t.name}${t.detected ? chalk.dim(' (detected)') : ''}`,
      value: t.name,
      checked: t.detected,
    })),
  });

  if (selected.length === 0) {
    process.stderr.write('No agents selected.\n');
    return;
  }

  process.stdout.write('\n');
  for (const name of selected) {
    const target = targets.find((t) => t.name === name);
    if (!target) continue;
    const dest = installTo(source, target);
    process.stdout.write(`  Installed: ${target.name}: ${dest}\n`);
  }
}

function installNonInteractive(source: string, targets: AgentTarget[]): void {
  const detected = targets.filter((t) => t.detected);
  if (detected.length === 0) {
    process.stderr.write(
      'No agents detected. Use --path to specify install location:\n  notion skill --path ~/.claude/skills/using-notion-cli/SKILL.md\n',
    );
    return;
  }
  for (const target of detected) {
    const dest = installTo(source, target);
    process.stdout.write(`Installed: ${target.name}: ${dest}\n`);
  }
}

export function skillCommand(): Command {
  const cmd = new Command('skill');
  cmd
    .description('Install the agent skill file for your coding agents')
    .option('--print', 'Print the skill file content instead of installing')
    .option('--path <path>', 'Install to a specific file path')
    .action(
      withErrorHandling(async (opts: { print?: boolean; path?: string }) => {
        if (opts.print) {
          process.stdout.write(readFileSync(skillPath(), 'utf-8'));
          return;
        }

        const source = skillPath();

        if (opts.path) {
          const dir = dirname(opts.path);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          copyFileSync(source, opts.path);
          process.stdout.write(`Installed to ${opts.path}\n`);
          return;
        }

        const targets = getAgentTargets();
        const isTTY = process.stdout.isTTY ?? false;

        if (isTTY) {
          await installInteractive(source, targets);
        } else {
          installNonInteractive(source, targets);
        }
      }),
    );
  return cmd;
}
