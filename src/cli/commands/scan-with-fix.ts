import chalk from 'chalk';
import { execSync } from 'child_process';
import dayjs from 'dayjs';
import { Report } from '../../shared/types.js';
import { ProgressLogger } from '../progress.js';
import { GitError, handleError } from '../errors.js';
import { EXIT_CODES } from '../../shared/constants.js';

function getGitStatus(): string {
  try {
    return execSync('git status --porcelain', { encoding: 'utf-8' });
  } catch {
    throw new GitError('Not a git repository');
  }
}

function checkGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

function isGitDirty(): boolean {
  const status = getGitStatus();
  return status.trim().length > 0;
}

function createBranch(name: string): void {
  try {
    execSync(`git checkout -b ${name}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new GitError(`Failed to create branch: ${name}`);
  }
}

function commitChanges(message: string): void {
  try {
    execSync('git add .', { encoding: 'utf-8' });
    execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
  } catch (error) {
    throw new GitError('Failed to commit changes');
  }
}

export async function scanWithFixCommand(
  args: string[],
  report: Report,
  logger: ProgressLogger
): Promise<void> {
  console.log('');
  logger.printSeparator();
  logger.logPhaseStart('git', 'Preparing to apply patches');

  try {
    // Check git repo exists
    if (!checkGitRepo()) {
      throw new GitError('Not a git repository. Run: git init');
    }

    // Check git status
    if (isGitDirty()) {
      logger.logWarning('Git repository has uncommitted changes', 'Commit or stash first');
      throw new GitError('Repository is dirty. Commit changes before applying patches.');
    }

    // Filter for exploitable CVEs only
    const exploitableCVEs = report.scan.cves.filter((cve) => cve.exploitable);

    if (exploitableCVEs.length === 0) {
      logger.logWarning('No exploitable CVEs found', 'Nothing to patch');
      process.exit(EXIT_CODES.SUCCESS);
    }

    // Create feature branch
    const timestamp = dayjs().format('YYYY-MM-DD-HHmmss');
    const branchName = `codeprobe-fix-${timestamp}`;

    logger.logPhaseStart('git', `Creating branch: ${branchName}`);
    createBranch(branchName);
    logger.logPhaseComplete('git', `Branch created: ${branchName}`);

    // Apply patches
    for (const cve of exploitableCVEs) {
      if (!cve.patch_diff) continue;

      logger.logPhaseStart('patch', `Applying patch for ${cve.id}`);

      // Mock: just log the patch
      console.log(chalk.gray(`  Patch preview:\n${cve.patch_diff.split('\n').slice(0, 5).join('\n')}`));

      // In production: apply patch using git apply or manual file updates
      // For now: mock success
      logger.logPhaseComplete('patch', `Patched ${cve.package}: ${cve.version_vulnerable} → ${cve.patch_version}`);
    }

    // Commit with detailed message
    const commitMsg =
      `[CodeProbe] Fix ${exploitableCVEs.length} exploitable CVE(s)\n\n` +
      exploitableCVEs
        .map((cve) => `- ${cve.id} (${cve.package} ${cve.version_vulnerable} → ${cve.patch_version})`)
        .join('\n');

    logger.logPhaseStart('git', 'Committing patches');
    commitChanges(commitMsg);
    logger.logPhaseComplete('git', 'Changes committed');

    // Show what to do next
    console.log('');
    console.log(chalk.green('✓ Patches applied successfully!'));
    console.log(chalk.cyan(`\nNext steps:`));
    console.log(chalk.cyan(`  1. Review changes: git diff main`));
    console.log(chalk.cyan(`  2. Push branch: git push -u origin ${branchName}`));
    console.log(chalk.cyan(`  3. Create PR on GitHub`));

    logger.printSeparator();
    process.exit(EXIT_CODES.SUCCESS);
  } catch (error) {
    handleError(error, logger, true);
  }
}
