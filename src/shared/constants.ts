export const API_ENDPOINTS = {
  BRIGHT_DATA: process.env.BRIGHT_DATA_API_URL || "https://api.brightdata.com",
  DAYTONA: process.env.DAYTONA_API_URL || "https://api.daytona.io",
  NOSANA: process.env.NOSANA_API_URL || "https://api.nosana.io",
  NVD: "https://services.nvd.nist.gov/rest/json/cves/2.0",
  SNYK: "https://security.snyk.io/api/v1/vulnerabilities",
};

export const TIMEOUTS = {
  BRIGHT_DATA_SCRAPE: 30000, // 30s
  DAYTONA_SANDBOX: 60000, // 60s per CVE
  NOSANA_LLM: 45000, // 45s
  HTTP_GENERAL: 10000, // 10s
};

export const SANDBOX_CONFIG = {
  BASE_IMAGE: "node:20-alpine",
  CPU: 1,
  MEMORY: "512Mi",
  DISK: "5Gi",
  TIMEOUT_MS: TIMEOUTS.DAYTONA_SANDBOX,
};

export const PATHS = {
  CONFIG_DIR: `${process.env.HOME}/.codeprobe`,
  SCANS_DIR: `${process.env.HOME}/.codeprobe/scans`,
  CACHE_FILE: `${process.env.HOME}/.codeprobe/cve-cache.json`,
  CONFIG_FILE: `${process.env.HOME}/.codeprobe/config.json`,
  PATCHES_FILE: `${process.env.HOME}/.codeprobe/patches.json`,
};

export const DEMO_CVE = {
  id: "CVE-2022-29078",
  package: "ejs",
  affected_versions: ["3.1.0", "3.1.1", "3.1.2", "3.1.3", "3.1.4", "3.1.5", "3.1.6"],
  fixed_version: "3.1.7",
  severity: "CRITICAL",
  cvss: 9.8,
  description:
    "ejs before 3.1.7 has a template injection vulnerability that allows arbitrary code execution",
  exploit_type: "Template Injection RCE",
};

export const RETRY_CONFIG = {
  MAX_RETRIES: 2,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
};
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
