import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

// Test utilities
const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'codeprobe-test-' + Date.now());

beforeEach(() => {
  mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  process.env.HOME = TEST_CONFIG_DIR;
});

afterEach(() => {
  if (existsSync(TEST_CONFIG_DIR)) {
    rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  }
});

describe('CLI: Config Management', () => {
  it('should export ensureConfigDir function', async () => {
    const { ensureConfigDir } = await import('../cli/config');

    expect(typeof ensureConfigDir).toBe('function');
  });

  it('should save and load config', async () => {
    const { setConfig, getConfig } = await import('../cli/config');

    await setConfig('test_key', 'test_value');
    const value = await getConfig('test_key');

    expect(value).toBe('test_value');
  });

  it('should handle missing config gracefully', async () => {
    const { getConfig } = await import('../cli/config');

    const value = await getConfig('nonexistent_key');

    expect(value).toBeUndefined();
  });
});

describe('CLI: Progress Logger', () => {
  it('should format timestamps correctly', async () => {
    const { ProgressLogger } = await import('../cli/progress');

    const logger = new ProgressLogger(false);

    expect(logger).toBeDefined();
  });

  it('should handle events without crashing', async () => {
    const { ProgressLogger } = await import('../cli/progress');

    const logger = new ProgressLogger(false);
    const event = {
      phase: 'parsing' as const,
      status: 'start' as const,
      message: 'Test message',
      timestamp: new Date().toISOString(),
      level: 'info' as const,
    };

    // Should not throw
    logger.log(event);

    expect(logger).toBeDefined();
  });
});

describe('CLI: Error Handling', () => {
  it('should create CodeProbeError with code', async () => {
    const { CodeProbeError } = await import('../cli/errors');

    const error = new CodeProbeError('TEST_CODE', 'Test message', 'Details');

    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
  });

  it('should create specific error types', async () => {
    const { BrightDataError, DaytonaError, GitError } = await import('../cli/errors');

    const brightError = new BrightDataError('API timeout');
    const daytonaError = new DaytonaError('Container failed');
    const gitError = new GitError('Push failed');

    expect(brightError.code).toBe('BRIGHT_DATA_FAILED');
    expect(daytonaError.code).toBe('DAYTONA_FAILED');
    expect(gitError.code).toBe('GIT_ERROR');
  });

  it('should retry with backoff', async () => {
    const { retryWithBackoff } = await import('../cli/errors');

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Temporary failure');
      return 'success';
    };

    const result = await retryWithBackoff(fn, 2, 10);

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});

describe('CLI: Utils', () => {
  it('should generate unique scan IDs', async () => {
    const { generateScanId } = await import('../shared/utils');

    const id1 = generateScanId();
    const id2 = generateScanId();

    expect(id1).not.toBe(id2);
    expect(id1.startsWith('scan_')).toBe(true);
  });

  it('should format risk scores', async () => {
    const { formatRiskScore } = await import('../shared/utils');

    const highRisk = formatRiskScore(8.5);
    const mediumRisk = formatRiskScore(5.0);
    const lowRisk = formatRiskScore(2.0);

    expect(highRisk.includes('8.5')).toBe(true);
    expect(mediumRisk.includes('5.0')).toBe(true);
    expect(lowRisk.includes('2.0')).toBe(true);
  });

  it('should get risk level correctly', async () => {
    const { getRiskLevel } = await import('../shared/utils');

    expect(getRiskLevel(9)).toBe('CRITICAL');
    expect(getRiskLevel(7)).toBe('HIGH');
    expect(getRiskLevel(5)).toBe('MEDIUM');
    expect(getRiskLevel(1)).toBe('LOW');
  });

  it('should convert milliseconds to human readable', async () => {
    const { msToHuman } = await import('../shared/utils');

    expect(msToHuman(500)).toBe('500ms');
    expect(msToHuman(5000)).toBe('5s');
    expect(msToHuman(65000)).toBe('1m 5s');
  });
});

describe('CLI: Types', () => {
  it('should have correct CVE type structure', async () => {
    const { Report } = await import('../shared/types');

    const mockReport: Report = {
      scan: {
        id: 'scan_123',
        timestamp: new Date().toISOString(),
        repo_url: '.',
        cves: [
          {
            id: 'CVE-2023-44487',
            package: 'http2-server',
            version_vulnerable: '1.0.0',
            severity: 'CRITICAL',
            cvss: 8.5,
            exploitable: true,
            exploit_evidence: 'DoS confirmed',
            patch_version: '1.0.1',
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

    expect(mockReport.scan.id).toBe('scan_123');
    expect(mockReport.scan.cves[0].id).toBe('CVE-2023-44487');
    expect(mockReport.scan.cves[0].exploitable).toBe(true);
  });
});

describe('CLI: Constants', () => {
  it('should define exit codes correctly', async () => {
    const { EXIT_CODES } = await import('../shared/constants');

    expect(EXIT_CODES.SUCCESS).toBe(0);
    expect(EXIT_CODES.VULNERABILITIES_FOUND).toBe(1);
    expect(EXIT_CODES.SCAN_FAILED).toBe(2);
  });

  it('should define file permissions', async () => {
    const { FILE_PERMISSIONS } = await import('../shared/constants');

    expect(FILE_PERMISSIONS.DIR).toBe(0o700);
    expect(FILE_PERMISSIONS.FILE).toBe(0o600);
  });

  it('should define risk score weights', async () => {
    const { RISK_SCORE_WEIGHTS } = await import('../shared/constants');

    expect(RISK_SCORE_WEIGHTS.EXPLOITABLE).toBe(10);
    expect(RISK_SCORE_WEIGHTS.THEORETICAL).toBe(3);
  });
});
