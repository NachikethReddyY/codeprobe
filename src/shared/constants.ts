import path from 'path';
import os from 'os';

export const PATHS = {
  HOME: os.homedir(),
  CODEPROBE_DIR: path.join(os.homedir(), '.codeprobe'),
  SCANS_DIR: path.join(os.homedir(), '.codeprobe', 'scans'),
  CONFIG_FILE: path.join(os.homedir(), '.codeprobe', 'config.json'),
  LATEST_SCAN: path.join(os.homedir(), '.codeprobe', 'scans', 'latest.json'),
  CVE_CACHE: path.join(process.cwd(), 'cve-cache.json'),
  PATCHES_FILE: path.join(process.cwd(), 'patches.json'),
} as const;

export const API_TIMEOUTS = {
  BRIGHT_DATA: 5000, // 5 seconds
  DAYTONA: 60000, // 60 seconds
  NOSANA: 30000, // 30 seconds
  GIT_OPERATION: 10000, // 10 seconds
} as const;

export const RETRY_POLICY = {
  MAX_RETRIES: 2,
  BACKOFF_MS: 1000,
} as const;

export const FILE_PERMISSIONS = {
  DIR: 0o700, // drwx------
  FILE: 0o600, // -rw-------
} as const;

export const RISK_SCORE_WEIGHTS = {
  EXPLOITABLE: 10,
  THEORETICAL: 3,
} as const;

export const EXIT_CODES = {
  SUCCESS: 0,
  VULNERABILITIES_FOUND: 1,
  SCAN_FAILED: 2,
} as const;

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'CodeProbe';

export const DEMO_CVE_ID = 'CVE-2023-44487';
export const DEMO_PACKAGE = 'http2-server';
