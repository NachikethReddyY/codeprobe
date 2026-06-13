import chalk from 'chalk';
import { ProgressLogger } from './progress.js';

export class CodeProbeError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'CodeProbeError';
  }
}

export class BrightDataError extends CodeProbeError {
  constructor(details?: string) {
    super('BRIGHT_DATA_FAILED', 'CVE scraping failed', details);
  }
}

export class DaytonaError extends CodeProbeError {
  constructor(details?: string) {
    super('DAYTONA_FAILED', 'Sandbox operation failed', details);
  }
}

export class NetworkError extends CodeProbeError {
  constructor(details?: string) {
    super('NETWORK_ERROR', 'Network operation failed', details);
  }
}

export class GitError extends CodeProbeError {
  constructor(details?: string) {
    super('GIT_ERROR', 'Git operation failed', details);
  }
}

export class ConfigError extends CodeProbeError {
  constructor(details?: string) {
    super('CONFIG_ERROR', 'Configuration error', details);
  }
}

export function handleError(error: unknown, logger: ProgressLogger, exitOnError = true): void {
  console.log('');
  logger.printSeparator();

  if (error instanceof CodeProbeError) {
    logger.logError(error.message, error.details);

    // Provide guidance for specific errors
    if (error.code === 'BRIGHT_DATA_FAILED') {
      console.log(chalk.yellow('→ Using cached CVE data (may be outdated)'));
      console.log(chalk.cyan('→ Run: codeprobe config set bright_data_api_key <key>'));
    } else if (error.code === 'GIT_ERROR') {
      console.log(chalk.yellow('→ Ensure git repository is clean'));
      console.log(chalk.cyan('→ Run: git status && git commit'));
    } else if (error.code === 'CONFIG_ERROR') {
      console.log(chalk.yellow('→ Run: codeprobe config set <key> <value>'));
    }
  } else if (error instanceof Error) {
    logger.logError(error.message, error.stack);
  } else {
    logger.logError('Unknown error occurred');
  }

  logger.printSeparator();
  console.log('');

  if (exitOnError) {
    process.exit(2); // Exit code 2 = scan failed
  }
}

export function wrapWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${errorMessage} (timeout: ${timeoutMs}ms)`)), timeoutMs)
    ),
  ]);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  backoffMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (i + 1)));
      }
    }
  }

  throw lastError;
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function logFallback(message: string, reason: string): void {
  console.log(chalk.yellow(`→ ${message}`));
  console.log(chalk.gray(`  Reason: ${reason}`));
}
