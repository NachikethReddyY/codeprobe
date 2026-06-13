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
}
