import type { ErrorCode } from './codes.js';

export class CliError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }

  format(): string {
    let output = `[${this.code}] ${this.message}`;
    if (this.suggestion) {
      output += `\n  → ${this.suggestion}`;
    }
    return output;
  }
}
