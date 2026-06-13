import chalk from 'chalk';
import { randomBytes } from 'crypto';

export function formatRiskScore(score: number): string {
  const level = getRiskLevel(score);
  const color = getRiskColor(score);
  return color(`${score.toFixed(1)}/10 (${level})`);
}

export function getRiskLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

export function getRiskColor(score: number) {
  if (score >= 8) return chalk.red;
  if (score >= 6) return chalk.yellow;
  if (score >= 4) return chalk.cyan;
  return chalk.green;
}

export function formatSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return chalk.red(severity);
    case 'HIGH':
      return chalk.yellow(severity);
    case 'MEDIUM':
      return chalk.cyan(severity);
    case 'LOW':
      return chalk.green(severity);
    default:
      return chalk.gray(severity);
  }
}

export function formatExploitable(exploitable: boolean): string {
  if (exploitable) {
    return chalk.red('✓ EXPLOITABLE');
  }
  return chalk.yellow('~ THEORETICAL');
}

export function generateScanId(): string {
  return `scan_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

export function bytesToHuman(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;

  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }

  return `${size.toFixed(2)} ${units[unitIdx]}`;
}

export function msToHuman(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}
