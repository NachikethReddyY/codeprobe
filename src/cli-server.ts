#!/usr/bin/env bun

import chalk from 'chalk';
import { RepositoryParser } from './engine/parser.js';
import { EXIT_CODES, APP_NAME, APP_VERSION } from './shared/constants.js';

interface ScanPayload {
  dependencies: Array<{ name: string; version: string }>;
  repoPath: string;
}

interface ScanResponse {
  success?: boolean;
  data?: {
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
  };
  // Legacy format support
  scan?: any;
  summary?: any;
}

interface CLIOptions {
  json: boolean;
  token: string;
  fix: boolean;
  verbose: boolean;
}

async function parseScanArgs(args: string[]): Promise<{ path: string; options: CLIOptions }> {
  const options: CLIOptions = {
    json: false,
    token: '',
    fix: false,
    verbose: false,
  };

  let path = process.cwd();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--token') {
      options.token = args[i + 1] || '';
      i++;
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
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

async function promptUser(question: string): Promise<string> {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

async function reviewAndApplyPatches(response: ScanResponse, absolutePath: string, options: CLIOptions): Promise<boolean> {
  const { scan } = response;

  if (scan.cves.length === 0) {
    console.log(chalk.green('\n✓ No vulnerabilities to fix'));
    return true;
  }

  console.log(chalk.bold.yellow('\n📋 Review Patches\n'));

  let patchCount = 0;
  for (const cve of scan.cves) {
    if (!cve.patch_diff) {
      console.log(chalk.dim(`⊘ ${cve.id}: No patch available`));
      continue;
    }

    patchCount++;
    console.log(chalk.bold(`\n${patchCount}. ${cve.id} (${cve.package}@${cve.version_vulnerable} → ${cve.version_fixed})`));
    console.log(`   Severity: ${colorSeverity(cve.severity)} | CVSS: ${cve.cvss}`);
    console.log(`   ${cve.description}`);

    console.log(chalk.gray('\nProposed changes:'));
    console.log(chalk.gray(cve.patch_diff));

    const answer = await promptUser(
      chalk.cyan('\nApply this patch? (yes/no/skip/view-details): ')
    );

    if (answer === 'yes' || answer === 'y') {
      console.log(chalk.green(`✓ Marked for patching: ${cve.id}`));
    } else if (answer === 'skip' || answer === 's') {
      console.log(chalk.yellow(`⊘ Skipped: ${cve.id}`));
      cve.patch_diff = ''; // Mark as not to be applied
    } else if (answer === 'no' || answer === 'n') {
      console.log(chalk.yellow(`⊘ Declined: ${cve.id}`));
      cve.patch_diff = '';
    } else {
      console.log(chalk.dim(cve.description));
      console.log(chalk.dim(`More info: https://nvd.nist.gov/vuln/detail/${cve.id}`));
    }
  }

  // Ask for final confirmation
  console.log(chalk.bold('\n📦 Summary\n'));
  const toApply = scan.cves.filter((c) => c.patch_diff).length;
  console.log(`Will apply ${toApply} patch(es)`);

  if (toApply === 0) {
    console.log(chalk.yellow('No patches to apply'));
    return false;
  }

  const final = await promptUser(chalk.cyan('\nProceed with patches? (yes/no): '));
  return final === 'yes' || final === 'y';
}

async function applyPatchesAndCreatePR(response: ScanResponse, absolutePath: string, options: CLIOptions): Promise<void> {
  const { scan } = response;

  console.log(chalk.bold.blue('\n🔧 Applying Patches\n'));

  // Create a new branch
  const branchName = `codeprobe-security-fixes-${Date.now()}`;
  console.log(chalk.dim(`Creating branch: ${branchName}`));

  try {
    await Bun.$`cd ${absolutePath} && git checkout -b ${branchName}`;
  } catch (error) {
    console.error(chalk.red(`Failed to create branch: ${error instanceof Error ? error.message : String(error)}`));
    return;
  }

  // Apply patches to package.json
  const patchesToApply = new Map<string, string>();
  for (const cve of scan.cves) {
    if (cve.patch_diff) {
      patchesToApply.set(cve.id, cve.patch_diff);
    }
  }

  // For demo: update package.json versions
  if (patchesToApply.size > 0) {
    console.log(chalk.dim('Updating package.json...'));
    const packageJsonPath = `${absolutePath}/package.json`;
    const packageFile = Bun.file(packageJsonPath);
    const content = await packageFile.text();
    const packageJson = JSON.parse(content);

    for (const cve of scan.cves) {
      if (cve.patch_diff && cve.version_fixed) {
        packageJson.dependencies[cve.package] = `^${cve.version_fixed}`;
        console.log(chalk.green(`✓ Updated ${cve.package} to ^${cve.version_fixed}`));
      }
    }

    await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  // Commit changes
  console.log(chalk.dim('Committing changes...'));
  try {
    await Bun.$`cd ${absolutePath} && git add package.json`;
    const commitMsg = `security: patch ${patchesToApply.size} vulnerabilit${patchesToApply.size === 1 ? 'y' : 'ies'} via codeprobe`;
    await Bun.$`cd ${absolutePath} && git commit -m ${commitMsg}`;
    console.log(chalk.green(`✓ Committed with message: "${commitMsg}"`));
  } catch (error) {
    console.error(chalk.red(`Failed to commit: ${error instanceof Error ? error.message : String(error)}`));
    return;
  }

  // Push to remote
  console.log(chalk.dim('Pushing to remote...'));
  try {
    await Bun.$`cd ${absolutePath} && git push -u origin ${branchName}`;
    console.log(chalk.green(`✓ Pushed to origin/${branchName}`));
  } catch (error) {
    console.error(chalk.red(`Failed to push: ${error instanceof Error ? error.message : String(error)}`));
    return;
  }

  // Create PR using GitHub CLI
  console.log(chalk.dim('Creating pull request...'));
  try {
    const prTitle = `Security: Patch ${patchesToApply.size} vulnerabilit${patchesToApply.size === 1 ? 'y' : 'ies'}`;
    const prBody = `## Security Patches via CodeProbe

${patchesToApply.size} vulnerabilities patched:
${scan.cves
  .filter((c) => c.patch_diff)
  .map((c) => `- **${c.id}**: ${c.package}@${c.version_vulnerable} → ${c.version_fixed}`)
  .join('\n')}

**Risk Score**: ${scan.risk_score.toFixed(1)}/10
**Exploitable CVEs**: ${scan.exploitable_count}

---
✓ Powered by Bright Data | Daytona | Nosana`;

    const prUrl = await Bun.$`cd ${absolutePath} && gh pr create --title ${prTitle} --body ${prBody} --web`.text();
    console.log(chalk.green(`✓ PR created! Opening in browser...`));
    console.log(chalk.cyan(prUrl.trim()));
  } catch (error) {
    console.error(chalk.yellow(`⚠ Failed to create PR automatically: ${error instanceof Error ? error.message : String(error)}`));
    console.log(chalk.dim(`You can manually create a PR from branch ${branchName}`));
  }

  console.log(chalk.bold.green('\n✨ Done! Your security patches are ready for review.\n'));
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

    const apiResponse = (await response.json()) as ScanResponse;

    // Extract scan and summary from nested or flat structure
    const scanResponse: any = {
      scan: apiResponse.data?.scan || apiResponse.scan,
      summary: apiResponse.data?.summary || apiResponse.summary,
    };

    if (!scanResponse.scan || !scanResponse.summary) {
      throw new Error('Invalid response format from server');
    }

    // If --fix mode, enter interactive review flow
    if (options.fix) {
      if (!options.json) {
        console.log('');
      }
      const approved = await reviewAndApplyPatches(scanResponse, absolutePath, options);
      if (approved) {
        await applyPatchesAndCreatePR(scanResponse, absolutePath, options);
      } else {
        console.log(chalk.yellow('Patches cancelled by user'));
        process.exit(EXIT_CODES.SUCCESS);
      }
    } else {
      // Normal report mode
      displayReport(scanResponse, options);

      // Determine exit code
      if (scanResponse.summary.exploitable_count > 0) {
        process.exit(EXIT_CODES.VULNERABILITIES_FOUND);
      } else {
        process.exit(EXIT_CODES.SUCCESS);
      }
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
  codeprobe scan [path] [--json] [--fix] [--token XXX]

${chalk.bold('ARGUMENTS')}
  path              Repository path (default: current directory)

${chalk.bold('OPTIONS')}
  --json            Output results as JSON (for pipe-friendly use)
  --fix             Interactive mode: review & apply patches, then create PR
  --token XXX       Authentication token (overrides CODEPROBE_SECRET env var)
  -v, --verbose     Show detailed logs
  --help            Show this help message

${chalk.bold('ENVIRONMENT VARIABLES')}
  SERVER_URL        Backend server URL (required)
  CODEPROBE_SECRET  Shared secret for authentication (required)

${chalk.bold('EXIT CODES')}
  0                 Success, no vulnerabilities (or patches applied)
  1                 Vulnerabilities found (exploitable)
  2                 Scan error

${chalk.bold('EXAMPLES')}
  codeprobe scan                                    # Scan and report
  codeprobe scan ./my-app --fix                     # Interactive fix mode
  codeprobe scan --json > report.json               # JSON output for CI
  codeprobe scan --token my-token                   # With custom token
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
