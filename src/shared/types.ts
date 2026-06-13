// Shared types for all CodeProbe modules
// Import/re-export from Stage 1 engine once available

export interface ScanEvent {
  phase:
    | 'parsing'
    | 'scraping'
    | 'matching'
    | 'sandboxing'
    | 'verification'
    | 'patching'
    | 'report';
  status: 'start' | 'progress' | 'complete' | 'error';
  message: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  metadata?: Record<string, unknown>;
}

export interface Dependency {
  name: string;
  version: string;
}

export interface CVE {
  id: string;
  package: string;
  version_vulnerable: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvss: number;
  exploitable: boolean;
  exploit_evidence: string;
  patch_diff?: string;
  patch_version?: string;
}

export interface Scan {
  id: string;
  timestamp: string;
  repo_url: string;
  cves: CVE[];
  risk_score: number;
  patches_available: number;
}

export interface Report {
  scan: Scan;
  summary: {
    exploitable_count: number;
    theoretical_count: number;
  };
}

export interface CliOptions {
  fix?: boolean;
  json?: boolean;
  verbose?: boolean;
  exportFormat?: 'json' | 'html' | 'text';
}

export interface ScanResult {
  report: Report;
  duration_ms: number;
}
