#!/usr/bin/env bun

import chalk from 'chalk';
import { APP_NAME, APP_VERSION, EXIT_CODES } from '../shared/constants.js';
import { ProgressLogger } from './progress.js';
import { handleError } from './errors.js';
import { scanCommand } from './commands/scan.js';
import { reportCommand } from './commands/report.js';

const logger = new ProgressLogger();

function showHelp(): void {
  console.log(`
${chalk.bold.cyan(`⚡ ${APP_NAME} v${APP_VERSION}`)}

${chalk.bold('USAGE')}
  codeprobe <command> [options] [arguments]

${chalk.bold('COMMANDS')}
  scan [path]     Scan a repository for vulnerabilities (default: current dir)
  report          Display last scan results
  config          Manage configuration
  help            Show this help message

${chalk.bold('OPTIONS')}
  --fix           Auto-fix vulnerabilities (creates git branch & commits)
  --json          Output results as JSON
  --verbose       Show detailed logs
  --help          Show help

${chalk.bold('EXAMPLES')}
  codeprobe scan
  codeprobe scan ./my-app
  codeprobe scan --fix
  codeprobe scan --json > report.json
  codeprobe report
  codeprobe config set bright_data_api_key <key>

${chalk.bold('DOCS')}
  https://github.com/codeprobe/codeprobe
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // No args = show help
  if (args.length === 0) {
    showHelp();
    process.exit(EXIT_CODES.SUCCESS);
  }

  const command = args[0];
  const restArgs = args.slice(1);

  try {
    switch (command) {
      case 'scan':
        await scanCommand(restArgs);
        break;

      case 'report':
        await reportCommand(restArgs);
        break;

      case 'config':
        await handleConfigCommand(restArgs);
        break;

      case '--help':
      case '-h':
      case 'help':
        showHelp();
        break;

      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        console.log(`Run ${chalk.cyan('codeprobe --help')} for usage`);
        process.exit(EXIT_CODES.SCAN_FAILED);
    }
  } catch (error) {
    handleError(error, logger, true);
  }
}

async function handleConfigCommand(args: string[]): Promise<void> {
  const { getConfig, setConfig, clearConfig } = await import('./config.js');

  const subcommand = args[0];

  switch (subcommand) {
    case 'get':
      {
        const key = args[1];
        if (!key) {
          const config = await getConfig();
          console.log(JSON.stringify(config, null, 2));
        } else {
          const value = await getConfig(key);
          console.log(value || `${key} not set`);
        }
      }
      break;

    case 'set':
      {
        const key = args[1];
        const value = args[2];
        if (!key || !value) {
          console.error(chalk.red('Usage: codeprobe config set <key> <value>'));
          process.exit(EXIT_CODES.SCAN_FAILED);
        }
        await setConfig(key, value);
      }
      break;

    case 'clear':
      {
        const key = args[1];
        if (!key) {
          console.error(chalk.red('Usage: codeprobe config clear <key>'));
          process.exit(EXIT_CODES.SCAN_FAILED);
        }
        await clearConfig(key);
      }
      break;

    default:
      console.error(chalk.red(`Unknown config subcommand: ${subcommand}`));
      console.log(`Usage: codeprobe config [get|set|clear]`);
      process.exit(EXIT_CODES.SCAN_FAILED);
  }
}

main().catch((error) => {
  handleError(error, logger, true);
});
