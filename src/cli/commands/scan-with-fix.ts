import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { Report } from '../../shared/types.js';
import { ProgressLogger } from '../progress.js';
import { GitError, handleError } from '../errors.js';
import { EXIT_CODES } from '../../shared/constants.js';

function checkGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function isGitDirty(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    return status.trim().length > 0;
  } catch {
    throw new GitError('Not a git repository');
  }
}

function createBranch(name: string): void {
  try {
    execSync(`git checkout -b ${name}`, { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    throw new GitError(`Failed to create branch: ${name}`);
  }
}

function commitAndPush(message: string, branchName: string): void {
  execSync('git add package.json', { encoding: 'utf-8', stdio: 'pipe' });
  execSync(`git -c commit.gpgsign=false commit -m "${message}"`, { encoding: 'utf-8', stdio: 'pipe' });
  try {
    execSync(`git push -u origin ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    // Push failed — not fatal, user can push manually
  }
}

function applyVersionBumps(
  repoPath: string,
  bumps: Array<{ package: string; from: string; to: string }>
): void {
  const pkgPath = path.join(repoPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  for (const bump of bumps) {
    if (pkg.dependencies?.[bump.package]) {
      pkg.dependencies[bump.package] = `^${bump.to}`;
    } else if (pkg.devDependencies?.[bump.package]) {
      pkg.devDependencies[bump.package] = `^${bump.to}`;
    }
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

export async function scanWithFixCommand(
  args: string[],
  report: Report,
  logger: ProgressLogger
): Promise<void> {
  console.log('');
  logger.printSeparator();

  const repoPath = path.resolve(args[0] || '.');

  // Collect CVEs that have a known fixed version
  const fixable = report.scan.cves.filter(
    (cve) => cve.version_fixed && cve.version_fixed.trim() !== ''
  );

  if (fixable.length === 0) {
    console.log(chalk.yellow('⚠️  No CVEs with known fixes found.'));
    console.log(chalk.dim('   All vulnerabilities are either unpatched or already on the latest version.'));
    process.exit(EXIT_CODES.SUCCESS);
  }

  // Deduplicate: one bump per package (use highest fixed version)
  const bumpMap = new Map<string, { from: string; to: string; cves: string[] }>();
  for (const cve of fixable) {
    const existing = bumpMap.get(cve.package);
    if (!existing) {
      bumpMap.set(cve.package, {
        from: cve.version_vulnerable,
        to: cve.version_fixed!,
        cves: [cve.id],
      });
    } else {
      existing.cves.push(cve.id);
    }
  }

  const bumps = Array.from(bumpMap.entries()).map(([pkg, info]) => ({
    package: pkg,
    ...info,
  }));

  // Show what will be changed
  console.log(chalk.bold(`\n📦 ${bumps.length} package(s) can be updated:\n`));
  for (const b of bumps) {
    console.log(
      `  ${chalk.cyan(b.package)}: ${chalk.red(b.from)} → ${chalk.green(b.to)}`
    );
    console.log(chalk.dim(`    Fixes: ${b.cves.slice(0, 3).join(', ')}${b.cves.length > 3 ? ` +${b.cves.length - 3} more` : ''}`));
  }

  // Check git repo
  if (!checkGitRepo()) {
    console.log(chalk.yellow('\n⚠️  Not a git repository — applying fixes without committing.'));
    applyVersionBumps(repoPath, bumps);
    console.log(chalk.green('\n✓ package.json updated. Run your package manager to install.'));
    process.exit(EXIT_CODES.SUCCESS);
  }

  if (isGitDirty()) {
    console.log(chalk.yellow('\n⚠️  Uncommitted changes detected — applying fixes without committing.'));
    applyVersionBumps(repoPath, bumps);
    console.log(chalk.green('\n✓ package.json updated. Commit when ready.'));
    process.exit(EXIT_CODES.SUCCESS);
  }

  // Create branch and apply fixes
  const branchName = `codeprobe-fix-${dayjs().format('YYYY-MM-DD-HHmmss')}`;
  console.log(chalk.dim(`\nCreating branch: ${branchName}`));
  createBranch(branchName);

  applyVersionBumps(repoPath, bumps);
  console.log(chalk.green('\n✓ package.json updated'));

  const commitMsg = `security: bump ${bumps.length} vulnerable package(s) via codeprobe\\n\\n${bumps.map(b => `- ${b.package}: ${b.from} -> ${b.to}`).join('\\n')}`;
  commitAndPush(commitMsg, branchName);

  console.log(chalk.bold.green(`\n✨ Done! Branch '${branchName}' created and pushed.\n`));
  console.log(chalk.cyan('Next steps:'));
  console.log(`  1. Run your package manager: ${chalk.white('bun install')} or ${chalk.white('npm install')}`);
  console.log(`  2. Open a PR from branch: ${chalk.white(branchName)}`);
  console.log('');

  logger.printSeparator();
  process.exit(EXIT_CODES.SUCCESS);
}
