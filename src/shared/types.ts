import { z } from "zod";

// CVE schema from vulnerability scraper (Stage 1: Bright Data, NVD, Snyk)
export const CVESchema = z.object({
  id: z.string(),
  package: z.string(),
  affected_versions: z.array(z.string()),
  fixed_version: z.string(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  cvss: z.number().min(0).max(10),
  description: z.string(),
  cwe: z.string().optional(),
  exploit_url: z.string().optional(),
});

export type CVE = z.infer<typeof CVESchema>;

// CVE result in a scan report (includes verification results from sandbox)
export const ScanCVESchema = z.object({
  id: z.string(),
  package: z.string(),
  version_vulnerable: z.string(),
  version_fixed: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  cvss: z.number().min(0).max(10),
  description: z.string(),
  exploitable: z.boolean(),
  exploit_evidence: z.string().optional(),
  patch_diff: z.string().optional(),
  patch_version: z.string().optional(),
  verification_time_ms: z.number().optional(),
});

export type ScanCVE = z.infer<typeof ScanCVESchema>;

// Complete scan result (Stage 1 + Stage 2)
export const ScanSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  repo_url: z.string(),
  repo_path: z.string().optional(),
  cves: z.array(ScanCVESchema),
  risk_score: z.number().min(0).max(10),
  exploitable_count: z.number(),
  theoretical_count: z.number(),
  total_dependencies: z.number(),
  patches_available: z.number().optional(),
});

export type Scan = z.infer<typeof ScanSchema>;

// Report with summary (for CLI output and Dashboard)
export const ReportSchema = z.object({
  scan: ScanSchema,
  summary: z.object({
    total_cves: z.number(),
    exploitable_count: z.number(),
    theoretical_count: z.number(),
    scan_duration_ms: z.number(),
  }),
});

export type Report = z.infer<typeof ReportSchema>;

// Dependency from package.json
export interface Dependency {
  name: string;
  version: string;
}

// Dependency matched with CVE
export interface DependencyMatch {
  dependency: Dependency;
  cves: CVE[];
}

// Result from CVE scraper (Bright Data, NVD, etc.)
export interface ScrapeResult {
  cves: CVE[];
  source: string;
  timestamp: string;
}

// Result from exploit sandbox (Daytona)
export interface SandboxResult {
  exploit_ran: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  success: boolean;
  time_ms: number;
}

// Scan event for progress reporting
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

// CLI options
export interface CliOptions {
  fix?: boolean;
  json?: boolean;
  verbose?: boolean;
  exportFormat?: 'json' | 'html' | 'text';
}

// Scan result with duration
export interface ScanResult {
  report: Report;
  duration_ms: number;
}
