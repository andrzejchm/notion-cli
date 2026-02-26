import type { CliError } from '../errors/cli-error.js';
import type { TokenResult } from '../types/config.js';
import { dim, error as colorError } from './color.js';

export function stderrWrite(msg: string): void {
  process.stderr.write(msg + '\n');
}

export function reportTokenSource(source: TokenResult['source']): void {
  stderrWrite(dim(`Using token from ${source}`));
}

export function reportError(err: CliError): void {
  stderrWrite(colorError(err.format()));
}
