import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PATHS, EXIT_CODES } from '../../shared/constants.js';
import { Report } from '../../shared/types.js';
import { formatRiskScore, formatSeverity, formatExploitable } from '../../shared/utils.js';
import { ProgressLogger } from '../progress.js';
import { handleError, CodeProbeError } from '../errors.js';

async function loadLatestReport(): Promise<Report> {
  if (!existsSync(PATHS.LATEST_SCAN)) {
    throw new CodeProbeError(
      'NO_REPORT',
      'No scan report found',
      `Run 'codeprobe scan' first to generate a report`
    );
  }

  const content = await readFile(PATHS.LATEST_SCAN, 'utf-8');
  return JSON.parse(content);
}

function displayReportTable(report: Report): void {
  const logger = new ProgressLogger();
  logger.printSeparator();

  console.log(chalk.bold('Last Scan Report'));
  console.log(`ID: ${chalk.cyan(report.scan.id)}`);
  console.log(`Time: ${report.scan.timestamp}`);
  console.log(`Risk Score: ${formatRiskScore(report.scan.risk_score)}`);
  console.log('');

  if (report.scan.cves.length === 0) {
    console.log(chalk.green('✓ No vulnerabilities found!'));
    logger.printSeparator();
    return;
  }

  // Display table header
  console.log(
    chalk.bold(
      'CVE ID'.padEnd(20) +
        'Package'.padEnd(20) +
        'Severity'.padEnd(12) +
        'Exploitable'.padEnd(15) +
        'Patch'
    )
  );
  console.log(chalk.gray('─'.repeat(80)));

  // Display each CVE
  report.scan.cves.forEach((cve) => {
    const cveId = cve.id.padEnd(20);
    const pkg = `${cve.package}@${cve.version_vulnerable}`.padEnd(20);
    const severity = formatSeverity(cve.severity).padEnd(12);
    const exploitable = formatExploitable(cve.exploitable).padEnd(15);
    const patch = cve.patch_version ? chalk.green(`→ ${cve.patch_version}`) : chalk.gray('none');

    console.log(`${cveId}${pkg}${severity}${exploitable}${patch}`);
  });

  logger.printSeparator();
}

function displayReportJSON(report: Report): void {
  console.log(JSON.stringify(report, null, 2));
}

export async function reportCommand(args: string[]): Promise<void> {
  const logger = new ProgressLogger();

  try {
    const exportFormat = args.includes('--json') ? 'json' : 'text';

    logger.logPhaseStart('report', 'Loading latest scan');

    const report = await loadLatestReport();

    logger.logPhaseComplete('report', 'Report loaded');

    if (exportFormat === 'json') {
      displayReportJSON(report);
    } else {
      displayReportTable(report);
    }

    process.exit(EXIT_CODES.SUCCESS);
  } catch (error) {
    handleError(error, logger, true);
  }
}
