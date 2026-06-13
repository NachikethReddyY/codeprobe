#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the package root directory
const packageRoot = path.resolve(__dirname, '..');

// Run bun with the CLI
const args = process.argv.slice(2);
const child = spawn('bun', ['run', path.join(packageRoot, 'src/cli-server.ts'), ...args], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code);
});
