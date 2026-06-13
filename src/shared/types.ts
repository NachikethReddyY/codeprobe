import { z } from "zod";

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
  verification_time_ms: z.number().optional(),
});

export type ScanCVE = z.infer<typeof ScanCVESchema>;

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
});

export type Scan = z.infer<typeof ScanSchema>;

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

export interface DependencyMatch {
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

export interface ScrapeResult {
  cves: CVE[];
  source: string;
  timestamp: string;
}

export interface SandboxResult {
  exploit_ran: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  success: boolean;
  time_ms: number;
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
