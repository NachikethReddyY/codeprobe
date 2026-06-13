import chalk from 'chalk';
import { writeFile, chmod, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PATHS, EXIT_CODES, FILE_PERMISSIONS } from '../../shared/constants.js';
import { ProgressLogger, createEventHandler } from '../progress.js';
import { handleError, CodeProbeError } from '../errors.js';
import { generateScanId, formatRiskScore, msToHuman } from '../../shared/utils.js';
import { Report } from '../../shared/types.js';
import { createEngine } from '../../engine/index.js';
import { createScraper } from '../../engine/scraper.js';

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
  const patchCount = report.scan.patches_available ?? 0;
  console.log(chalk.green(`Patches Available: ${patchCount}/${report.summary.total_cves}`));
  console.log(`Duration: ${msToHuman(durationMs)}`);

  // Display SAST findings if available
  if ((report as any).code_vulnerabilities && (report as any).code_vulnerabilities.length > 0) {
    const codeVulns = (report as any).code_vulnerabilities;
    console.log(chalk.bold('\n🔐 Source Code Vulnerabilities:'));
    codeVulns.forEach((vuln: any) => {
      const severity = vuln.severity === 'CRITICAL' ? chalk.red(vuln.severity)
        : vuln.severity === 'HIGH' ? chalk.yellow(vuln.severity)
        : vuln.severity === 'MEDIUM' ? chalk.cyan(vuln.severity)
        : chalk.green(vuln.severity);
      console.log(`  ${severity} ${vuln.type} in ${vuln.file}:${vuln.line}`);
      console.log(`    ${vuln.description}`);
    });
  }

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

  const startTime = Date.now();

  try {
    const engine = createEngine();

    // Run recursive scan to find all package.json files
    const report = await engine.scanRecursive(repoPath);

    // Also scan for source code vulnerabilities (SAST)
    console.log("\n🔐 Analyzing source code for vulnerabilities...");
    const codeVulnerabilities = await engine.scanCodeVulnerabilities(repoPath);

    // If --fix flag is set, apply fixes to source code
    if (options.fix && codeVulnerabilities.length > 0) {
      const { createCodeFixer } = await import("../../engine/code-fixer.js");
      const fixer = createCodeFixer();
      console.log("\n🔧 Applying source code fixes...");
      const fixes = await fixer.fixVulnerabilities(codeVulnerabilities);
      console.log(`   Applied ${fixes.length} code fixes`);

      if (fixes.length > 0) {
        console.log("\n📝 Fixed vulnerabilities:");
        fixes.forEach((fix) => {
          console.log(`   - ${fix.file}:${fix.line}`);
          console.log(`     Type: ${fix.type}`);
        });
      }
    }

    const duration = Date.now() - startTime;

    // Save report
    const scanPath = await saveReport(report);
    logger.logPhaseComplete('report', `Report saved to ${scanPath}`);

    // Display results
    displayReport(report, options.json, duration);

    // Show recent npm threats from GitHub Advisory Database
    if (!options.json) {
      try {
        const scraper = createScraper();
        const threats = await scraper.fetchRecentThreats();
        if (threats.length > 0) {
          console.log(chalk.bold('\n🌐 Recent npm Security Threats (GitHub Advisory Database):'));
          console.log(chalk.gray('─'.repeat(60)));
          for (const t of threats.slice(0, 5)) {
            const sev = t.severity === 'CRITICAL' ? chalk.red(t.severity)
              : t.severity === 'HIGH' ? chalk.yellow(t.severity)
              : chalk.blue(t.severity);
            console.log(`  ${sev} ${chalk.bold(t.title)}`);
            if (t.packages.length > 0) {
              console.log(chalk.dim(`    Packages: ${t.packages.join(', ')}`));
            }
            console.log(chalk.dim(`    ${t.published?.slice(0, 10)} · ${t.url}`));
          }
          console.log('');
        }
      } catch {
        // Non-fatal — threats feed is best-effort
      }
    }

    // If --fix, handle that next
    if (options.fix) {
      const { scanWithFixCommand } = await import('./scan-with-fix.js');
      await scanWithFixCommand([repoPath], report, logger);
    }

    // Exit with appropriate code
    const hasVulnerabilities = report.scan.cves.length > 0;
    process.exit(hasVulnerabilities ? EXIT_CODES.VULNERABILITIES_FOUND : EXIT_CODES.SUCCESS);
  } catch (error) {
    handleError(error, logger, true);
  }
}
