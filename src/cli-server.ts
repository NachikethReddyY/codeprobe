#!/usr/bin/env bun

import chalk from 'chalk';
import { RepositoryParser } from './engine/parser.js';
import { EXIT_CODES, APP_NAME, APP_VERSION } from './shared/constants.js';

interface ScanPayload {
  dependencies: Array<{ name: string; version: string }>;
  repoPath: string;
}

interface ScanResponse {
  scan: {
    id: string;
    timestamp: string;
    repo_url: string;
    repo_path: string;
    cves: Array<{
      id: string;
      package: string;
      version_vulnerable: string;
      version_fixed?: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      cvss: number;
      description: string;
      exploitable: boolean;
      exploit_evidence?: string;
      patch_diff?: string;
      patch_version?: string;
      verification_time_ms?: number;
    }>;
    risk_score: number;
    exploitable_count: number;
    theoretical_count: number;
    total_dependencies: number;
    patches_available?: number;
  };
  summary: {
    total_cves: number;
    exploitable_count: number;
    theoretical_count: number;
    scan_duration_ms: number;
  };
}

interface CLIOptions {
  json: boolean;
  token: string;
}

async function parseScanArgs(args: string[]): Promise<{ path: string; options: CLIOptions }> {
  const options: CLIOptions = {
    json: false,
    token: '',
  };

  let path = process.cwd();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--token') {
      options.token = args[i + 1] || '';
      i++;
    } else if (!arg.startsWith('--')) {
      path = arg;
    }
  }

  return { path, options };
}

function colorSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return chalk.red(severity);
    case 'HIGH':
      return chalk.yellow(severity);
    case 'MEDIUM':
      return chalk.blue(severity);
    case 'LOW':
      return chalk.green(severity);
    default:
      return severity;
  }
}

function displayReport(response: ScanResponse, options: CLIOptions): void {
  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  const { scan, summary } = response;

  console.log('\n' + chalk.bold.cyan(`${APP_NAME} Vulnerability Report`));
  console.log(chalk.gray('═'.repeat(60)));

  // Summary section
  console.log(chalk.bold('\nSummary:'));
  console.log(`  ${chalk.cyan('Total CVEs:')} ${summary.total_cves}`);
  console.log(
    `  ${chalk.cyan('Exploitable:')} ${chalk.red(String(summary.exploitable_count))}`
  );
  console.log(
    `  ${chalk.cyan('Theoretical:')} ${chalk.yellow(String(summary.theoretical_count))}`
  );
  console.log(`  ${chalk.cyan('Scan Duration:')} ${summary.scan_duration_ms}ms`);
  console.log(`  ${chalk.cyan('Risk Score:')} ${getRiskColor(scan.risk_score)(String(scan.risk_score.toFixed(1)))}/10`);

  // CVEs section
  if (scan.cves.length > 0) {
    console.log(chalk.bold('\nVulnerabilities:'));
    console.log(chalk.gray('─'.repeat(60)));

    for (const cve of scan.cves) {
      console.log(`\n  ${chalk.bold(cve.id)} ${colorSeverity(cve.severity)}`);
      console.log(`    Package: ${chalk.cyan(cve.package)}@${cve.version_vulnerable}`);
      console.log(`    CVSS: ${cve.cvss}/10`);
      console.log(`    Status: ${cve.exploitable ? chalk.red('EXPLOITABLE') : chalk.green('Not exploitable')}`);

      if (cve.version_fixed) {
        console.log(`    Fixed in: ${chalk.green(cve.version_fixed)}`);
      }

      if (cve.description) {
        console.log(`    Description: ${cve.description.substring(0, 80)}${cve.description.length > 80 ? '...' : ''}`);
      }
    }
    console.log(chalk.gray('─'.repeat(60)));
  } else {
    console.log(chalk.green('\n✓ No vulnerabilities detected'));
  }

  // Sponsor branding
  console.log(
    chalk.dim(
      '\n✓ Powered by Bright Data | Daytona | Nosana'
    )
  );

  console.log('');
}

function getRiskColor(score: number) {
  if (score >= 8) return chalk.red;
  if (score >= 5) return chalk.yellow;
  if (score >= 2) return chalk.blue;
  return chalk.green;
}

async function scanCommand(args: string[]): Promise<void> {
  const { path, options } = await parseScanArgs(args);

  // Resolve absolute path
  const absolutePath = path.startsWith('/') ? path : `${process.cwd()}/${path}`;

  if (!options.json) {
    console.log(chalk.cyan(`\n⚡ CodeProbe Scanner v${APP_VERSION}`));
    console.log(chalk.gray('Scanning: ' + absolutePath));
  }

  try {
    // Parse dependencies
    if (!options.json) {
      console.log(chalk.gray('Parsing dependencies...'));
    }

    const parser = new RepositoryParser();
    const dependencies = await parser.parseDependencies(absolutePath);

    if (dependencies.length === 0 && !options.json) {
      console.log(chalk.yellow('⚠ No dependencies found in package.json'));
      process.exit(EXIT_CODES.SUCCESS);
    }

    // Prepare payload
    const payload: ScanPayload = {
      dependencies,
      repoPath: absolutePath,
    };

    // Get server URL from env
    const serverUrl = process.env.SERVER_URL;
    if (!serverUrl) {
      throw new Error(
        'SERVER_URL environment variable not set. Set it to your scan server URL.'
      );
    }

    // Get secret from env
    const secret = process.env.CODEPROBE_SECRET;
    if (!secret) {
      throw new Error(
        'CODEPROBE_SECRET environment variable not set. Set it to your shared secret.'
      );
    }

    // POST to server
    if (!options.json) {
      console.log(chalk.gray('Sending to server...'));
    }

    const response = await fetch(`${serverUrl}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Server error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const scanResponse = (await response.json()) as ScanResponse;

    // Display report
    displayReport(scanResponse, options);

    // Determine exit code
    if (scanResponse.summary.exploitable_count > 0) {
      process.exit(EXIT_CODES.VULNERABILITIES_FOUND);
    } else {
      process.exit(EXIT_CODES.SUCCESS);
    }
  } catch (error) {
    if (options.json) {
      console.log(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })
      );
    } else {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
    process.exit(EXIT_CODES.SCAN_FAILED);
  }
}

// Main entry point
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
${chalk.bold.cyan(`⚡ ${APP_NAME} v${APP_VERSION} - CLI Scanner`)}

${chalk.bold('USAGE')}
  codeprobe scan [path] [--json] [--token XXX]

${chalk.bold('ARGUMENTS')}
  path              Repository path (default: current directory)

${chalk.bold('OPTIONS')}
  --json            Output results as JSON (for pipe-friendly use)
  --token XXX       Authentication token (overrides CODEPROBE_SECRET env var)
  --help            Show this help message

${chalk.bold('ENVIRONMENT VARIABLES')}
  SERVER_URL        Backend server URL (required)
  CODEPROBE_SECRET  Shared secret for authentication (required)

${chalk.bold('EXIT CODES')}
  0                 Success, no vulnerabilities
  1                 Vulnerabilities found (exploitable)
  2                 Scan error

${chalk.bold('EXAMPLES')}
  codeprobe scan
  codeprobe scan ./my-app
  codeprobe scan --json > report.json
  codeprobe scan --token my-token
  SERVER_URL=http://localhost:3000 CODEPROBE_SECRET=secret codeprobe scan

${chalk.bold('DOCS')}
  https://github.com/codeprobe/codeprobe
`);
  process.exit(EXIT_CODES.SUCCESS);
}

// Check if first arg is a scan command
const command = args[0];
if (command === 'scan' || !command.startsWith('--')) {
  const scanArgs = command === 'scan' ? args.slice(1) : args;
  scanCommand(scanArgs).catch((error) => {
    console.error(chalk.red(`Fatal error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(EXIT_CODES.SCAN_FAILED);
  });
} else {
  console.error(
    chalk.red(`Unknown command: ${command}`)
  );
  console.log(`Run ${chalk.cyan('codeprobe --help')} for usage`);
  process.exit(EXIT_CODES.SCAN_FAILED);
}
