import { CliError } from './cli-error.js';
import { ErrorCodes } from './codes.js';

function mapNotionErrorCode(code: string): string {
  switch (code) {
    case 'unauthorized':
      return ErrorCodes.AUTH_INVALID;
    case 'rate_limited':
      return ErrorCodes.API_RATE_LIMITED;
    case 'object_not_found':
      return ErrorCodes.API_NOT_FOUND;
    default:
      return ErrorCodes.API_ERROR;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: generic wrapper must accept any argument list
export function withErrorHandling<T extends (...args: any[]) => Promise<void>>(
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof CliError) {
        process.stderr.write(`${error.format()}\n`);
        process.exit(1);
      }

      // Lazy import to keep startup fast
      const { isNotionClientError } = await import('@notionhq/client');
      if (isNotionClientError(error)) {
        const code = mapNotionErrorCode(error.code);
        const mappedError = new CliError(
          code as CliError['code'],
          error.message,
          code === ErrorCodes.AUTH_INVALID
            ? 'Run "notion init" to reconfigure your integration token'
            : undefined,
        );
        process.stderr.write(`${mappedError.format()}\n`);
        process.exit(1);
      }

      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[${ErrorCodes.UNKNOWN}] ${message}\n`);
      process.exit(1);
    }
  }) as T;
}
