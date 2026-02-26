import { Command } from 'commander';
import { CliError } from '../errors/cli-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { withErrorHandling } from '../errors/error-handler.js';

const BASH_COMPLETION = `# notion bash completion
_notion_completion() {
  local cur prev words cword
  _init_completion || return

  local commands="init profile completion --help --version --verbose --color"
  local profile_commands="list use remove"

  case "$prev" in
    notion)
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      return 0
      ;;
    profile)
      COMPREPLY=($(compgen -W "$profile_commands" -- "$cur"))
      return 0
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
      return 0
      ;;
  esac

  COMPREPLY=($(compgen -W "$commands" -- "$cur"))
}

complete -F _notion_completion notion
`;

const ZSH_COMPLETION = `#compdef notion
# notion zsh completion

_notion() {
  local -a commands

  commands=(
    'init:authenticate with Notion and save a profile'
    'profile:manage authentication profiles'
    'completion:output shell completion script'
  )

  local -a global_opts
  global_opts=(
    '--help[display help]'
    '--version[output version]'
    '--verbose[show API requests/responses]'
    '--color[force color output]'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    _arguments $global_opts
    return
  fi

  case $words[2] in
    profile)
      local -a profile_cmds
      profile_cmds=(
        'list:list all authentication profiles'
        'use:switch the active profile'
        'remove:remove an authentication profile'
      )
      _describe 'profile command' profile_cmds
      ;;
    completion)
      local -a shells
      shells=('bash' 'zsh' 'fish')
      _describe 'shell' shells
      ;;
  esac
}

_notion "$@"
`;

const FISH_COMPLETION = `# notion fish completion

# Disable file completion by default
complete -c notion -f

# Global options
complete -c notion -l help -d 'display help'
complete -c notion -l version -d 'output version'
complete -c notion -l verbose -d 'show API requests/responses'
complete -c notion -l color -d 'force color output'

# Top-level commands
complete -c notion -n '__fish_use_subcommand' -a init -d 'authenticate with Notion and save a profile'
complete -c notion -n '__fish_use_subcommand' -a profile -d 'manage authentication profiles'
complete -c notion -n '__fish_use_subcommand' -a completion -d 'output shell completion script'

# profile subcommands
complete -c notion -n '__fish_seen_subcommand_from profile' -a list -d 'list all authentication profiles'
complete -c notion -n '__fish_seen_subcommand_from profile' -a use -d 'switch the active profile'
complete -c notion -n '__fish_seen_subcommand_from profile' -a remove -d 'remove an authentication profile'

# completion shells
complete -c notion -n '__fish_seen_subcommand_from completion' -a bash -d 'bash completion script'
complete -c notion -n '__fish_seen_subcommand_from completion' -a zsh -d 'zsh completion script'
complete -c notion -n '__fish_seen_subcommand_from completion' -a fish -d 'fish completion script'
`;

export function completionCommand(): Command {
  const cmd = new Command('completion');

  cmd
    .description('output shell completion script')
    .argument('<shell>', 'shell type (bash, zsh, fish)')
    .action(withErrorHandling(async (shell: string) => {
      switch (shell) {
        case 'bash':
          process.stdout.write(BASH_COMPLETION);
          break;
        case 'zsh':
          process.stdout.write(ZSH_COMPLETION);
          break;
        case 'fish':
          process.stdout.write(FISH_COMPLETION);
          break;
        default:
          throw new CliError(
            ErrorCodes.UNKNOWN,
            `Unknown shell: "${shell}".`,
            'Supported shells: bash, zsh, fish',
          );
      }
    }));

  return cmd;
}
