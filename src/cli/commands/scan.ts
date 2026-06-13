import chalk from 'chalk';
import { writeFile, chmod, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PATHS, EXIT_CODES, FILE_PERMISSIONS } from '../../shared/constants.js';
import { ProgressLogger, createEventHandler } from '../progress.js';
import { handleError, CodeProbeError } from '../errors.js';
import { generateScanId, formatRiskScore, msToHuman } from '../../shared/utils.js';
import { Report } from '../../shared/types.js';

interface ScanOptions {
  fix: boolean;
  json: boolean;
  verbose: boolean;
}

function parseArgs(args: string[]): { repoPath: string; options: ScanOptions } {
  const options: ScanOptions = {
    fix: false,
    json: false,
    verbose: false,
  };

  let repoPath = '.';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (!arg.startsWith('--')) {
      repoPath = arg;
    }
  }

  return { repoPath, options };
}

async function saveReport(report: Report): Promise<string> {
  // Ensure directory exists
  if (!existsSync(PATHS.SCANS_DIR)) {
    await mkdir(PATHS.SCANS_DIR, { mode: FILE_PERMISSIONS.DIR, recursive: true });
  }

  const scanPath = path.join(PATHS.SCANS_DIR, `${report.scan.id}.json`);
  const content = JSON.stringify(report, null, 2);

  await writeFile(scanPath, content, 'utf-8');
  await chmod(scanPath, FILE_PERMISSIONS.FILE); // Owner read/write only

  // Also update latest.json (copy, not symlink, for portability)
  const latestPath = path.join(PATHS.SCANS_DIR, 'latest.json');
  await writeFile(latestPath, content, 'utf-8');
  await chmod(latestPath, FILE_PERMISSIONS.FILE);

  return scanPath;
}

function displayReport(report: Report, json: boolean, durationMs: number): void {
  if (json) {
    console.log(JSON.stringify({ report, duration_ms: durationMs }, null, 2));
    return;
  }

  const logger = new ProgressLogger(false);
  logger.printSeparator();

  console.log(chalk.bold('SCAN COMPLETE'));
  console.log(`Risk Score: ${formatRiskScore(report.scan.risk_score)}`);
  console.log(
    chalk.cyan(
      `Confirmed Exploitable: ${report.summary.exploitable_count} | ` +
        `Theoretical Risk: ${report.summary.theoretical_count}`
    )
  );
  console.log(`Patches Available: ${report.scan.patches_available}`);
  console.log(`Duration: ${msToHuman(durationMs)}`);

  if (report.scan.cves.length > 0) {
    console.log(chalk.bold('\nCVE Details:'));
    report.scan.cves.forEach((cve) => {
      const exploitStatus = cve.exploitable
        ? chalk.red('✓ CONFIRMED EXPLOITABLE')
        : chalk.yellow('~ Theoretical Risk');
      console.log(
        `  ${cve.id}: ${cve.package} ${cve.version_vulnerable} [${cve.severity}] ${exploitStatus}`
      );
      if (cve.patch_version) {
        console.log(`    → Patch available: ${cve.patch_version}`);
      }
    });
  }

  logger.printSeparator();
}

export async function scanCommand(args: string[]): Promise<void> {
  const { repoPath, options } = parseArgs(args);
  const logger = new ProgressLogger(options.verbose);

  logger.printHeader();

  // Mock engine until Stage 1 is ready
  // In production, this imports from ../engine
  const mockReport: Report = {
    scan: {
      id: generateScanId(),
      timestamp: new Date().toISOString(),
      repo_url: repoPath,
      cves: [
        {
          id: 'CVE-2023-44487',
          package: 'http2-server',
          version_vulnerable: '1.0.0',
          severity: 'CRITICAL',
          cvss: 8.5,
          exploitable: true,
          exploit_evidence: 'DoS attack succeeded in 0.8s',
          patch_version: '1.0.1',
          patch_diff: '--- a/package.json\n+++ b/package.json\n-  "http2-server": "1.0.0"\n+  "http2-server": "1.0.1"',
        },
      ],
      risk_score: 8.5,
      patches_available: 1,
    },
    summary: {
      exploitable_count: 1,
      theoretical_count: 0,
    },
  };

  const startTime = Date.now();

  try {
    logger.logPhaseStart('parsing', 'Parsing dependencies');
    await new Promise((r) => setTimeout(r, 1000)); // Mock delay
    logger.logPhaseComplete('parsing', 'Found 1 dependency');

    logger.logPhaseStart('scraping', 'Fetching CVE data');
    await new Promise((r) => setTimeout(r, 1500)); // Mock delay
    logger.logPhaseComplete('scraping', 'Found 1 CVE');

    logger.logPhaseStart('verification', 'Running exploit verification');
    await new Promise((r) => setTimeout(r, 2000)); // Mock delay
    logger.logPhaseComplete('verification', 'CONFIRMED EXPLOITABLE');

    const duration = Date.now() - startTime;

    // Save report
    const scanPath = await saveReport(mockReport);
    logger.logPhaseComplete('report', `Report saved to ${scanPath}`);

    // Display results
    displayReport(mockReport, options.json, duration);

    // If --fix, handle that next
    if (options.fix) {
      const { scanWithFixCommand } = await import('./scan-with-fix.js');
      await scanWithFixCommand([repoPath], mockReport, logger);
    }

    // Exit with appropriate code
    const hasVulnerabilities = mockReport.scan.cves.length > 0;
    process.exit(hasVulnerabilities ? EXIT_CODES.VULNERABILITIES_FOUND : EXIT_CODES.SUCCESS);
  } catch (error) {
    handleError(error, logger, true);
  }
}
