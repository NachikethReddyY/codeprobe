#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get the package root directory
const packageRoot = path.resolve(__dirname, '..');

// Try to find bun
function findBun() {
  try {
    // Try system bun
    execSync('bun --version', { stdio: 'pipe' });
    return 'bun';
  } catch (e) {
    // Try home directory
    const bunPath = path.join(os.homedir(), '.bun', 'bin', 'bun');
    if (fs.existsSync(bunPath)) {
      return bunPath;
    }
    return null;
  }
}

// Find or install bun
let bunCmd = findBun();
if (!bunCmd) {
  console.error('❌ Bun is not installed.');
  console.error('Installing Bun...');
  try {
    execSync('curl -fsSL https://bun.sh/install | bash', { stdio: 'inherit' });
    bunCmd = path.join(os.homedir(), '.bun', 'bin', 'bun');
  } catch (err) {
    console.error('Failed to install Bun. Please install manually: https://bun.sh');
    process.exit(1);
  }
}

// Run the CLI
const args = process.argv.slice(2);
const cmd = `${bunCmd} run ${path.join(packageRoot, 'src/cli-server.ts')} ${args.join(' ')}`;

try {
  execSync(cmd, {
    stdio: 'inherit',
    cwd: packageRoot
  });
} catch (err) {
  process.exit(err.status || 1);
}
