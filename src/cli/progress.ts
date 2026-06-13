import chalk from 'chalk';
import dayjs from 'dayjs';
import { ScanEvent } from '../shared/types.js';

export class ProgressLogger {
  private startTime: number = Date.now();
  private lastPhase: string = '';

  constructor(private verbose: boolean = false) {}

  log(event: ScanEvent): void {
    if (!this.verbose && event.level === 'info') {
      // Only show progress/complete/error in non-verbose mode
      if (event.status === 'progress' || event.status === 'start') {
        return;
      }
    }

    const timestamp = dayjs().format('HH:mm:ss');
    const prefix = `[${timestamp}]`;

    let output = '';
    const icon = this.getIcon(event.level, event.status);

    switch (event.level) {
      case 'success':
        output = chalk.green(`${prefix} ${icon} ${event.message}`);
        break;
      case 'warn':
        output = chalk.yellow(`${prefix} ${icon} ${event.message}`);
        break;
      case 'error':
        output = chalk.red(`${prefix} ${icon} ${event.message}`);
        break;
      default:
        output = chalk.cyan(`${prefix} ${icon} ${event.message}`);
    }

    if (event.metadata && this.verbose) {
      output += chalk.gray(` ${JSON.stringify(event.metadata)}`);
    }

    console.log(output);
    this.lastPhase = event.phase;
  }

  private getIcon(level: string, status: string): string {
    switch (level) {
      case 'success':
        return '✓';
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      default:
        if (status === 'start') return '▶️';
        if (status === 'complete') return '✓';
        return '•';
    }
  }

  logPhaseStart(phase: string, message: string): void {
    const timestamp = dayjs().format('HH:mm:ss');
    console.log(chalk.cyan(`[${timestamp}] ▶️  ${message}...`));
  }

  logPhaseComplete(phase: string, message: string): void {
    const timestamp = dayjs().format('HH:mm:ss');
    console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
  }

  logError(message: string, details?: string): void {
    const timestamp = dayjs().format('HH:mm:ss');
    console.log(chalk.red(`[${timestamp}] ❌ ${message}`));
    if (details) {
      console.log(chalk.gray(`    ${details}`));
    }
  }

  logWarning(message: string, details?: string): void {
    const timestamp = dayjs().format('HH:mm:ss');
    console.log(chalk.yellow(`[${timestamp}] ⚠️  ${message}`));
    if (details) {
      console.log(chalk.gray(`    ${details}`));
    }
  }

  printSeparator(): void {
    console.log(chalk.gray('────────────────────────────────────────────────'));
  }

  printHeader(): void {
    console.log(chalk.bold.cyan('⚡ CodeProbe v1.0.0'));
  }

  printElapsedTime(): void {
    const elapsed = Date.now() - this.startTime;
    const ms = elapsed % 1000;
    const s = Math.floor(elapsed / 1000) % 60;
    const m = Math.floor(elapsed / 60000);

    const timeStr =
      m > 0
        ? `${m}m ${s}s`
        : s > 0
          ? `${s}s`
          : `${ms}ms`;

    console.log(chalk.gray(`⏱️  Completed in ${timeStr}`));
  }
}

export function createEventHandler(verbose: boolean = false) {
  const logger = new ProgressLogger(verbose);

  return (event: ScanEvent) => {
    logger.log(event);
  };
}
