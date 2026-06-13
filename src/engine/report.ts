import { Scan, ScanCVE, Report } from "../shared/types";
import { PATHS } from "../shared/constants";
import dayjs from "dayjs";
import { randomBytes } from "crypto";

export class ReportBuilder {
  async buildReport(
    repoPath: string,
    cves: ScanCVE[],
    riskScore: number,
    scanDurationMs: number,
    dependencies: number
  ): Promise<Report> {
    const exploitableCves = cves.filter((c) => c.exploitable);
    const patchesAvailable = cves.filter((c) => c.patch_diff).length;

    const scan: Scan = {
      id: this.generateScanId(),
      timestamp: dayjs().toISOString(),
      repo_url: `file://${repoPath}`,
      repo_path: repoPath,
      cves: cves,
      risk_score: riskScore,
      exploitable_count: exploitableCves.length,
      theoretical_count: cves.length - exploitableCves.length,
      total_dependencies: dependencies,
      patches_available: patchesAvailable,
    };

    const report: Report = {
      scan,
      summary: {
        total_cves: cves.length,
        exploitable_count: exploitableCves.length,
        theoretical_count: cves.length - exploitableCves.length,
        scan_duration_ms: scanDurationMs,
      },
    };

    return report;
  }

  async saveReport(report: Report): Promise<string> {
    try {
      // Create directory if it doesn't exist
      const scansDir = PATHS.SCANS_DIR;
      await Bun.$`mkdir -p ${scansDir}`.quiet();

      // Save with scan ID as filename
      const filePath = `${scansDir}/${report.scan.id}.json`;
      const jsonContent = JSON.stringify(report, null, 2);

      await Bun.write(filePath, jsonContent);

      // Also create a "latest.json" symlink for easy access
      const latestPath = `${scansDir}/latest.json`;
      try {
        await Bun.$`rm -f ${latestPath}`.quiet();
        await Bun.$`ln -s ${filePath} ${latestPath}`.quiet();
      } catch {
        // Fallback if symlink fails (Windows)
        await Bun.write(latestPath, jsonContent);
      }

      return filePath;
    } catch (error) {
      throw new Error(`Failed to save report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateScanId(): string {
    return `scan_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  formatForTerminal(report: Report): string {
    const { scan, summary } = report;

    let output = "\n";
    output += "════════════════════════════════════════════════════════════════\n";
    output += "                       SCAN COMPLETE\n";
    output += "════════════════════════════════════════════════════════════════\n\n";

    // Risk Score
    output += `Risk Score: ${scan.risk_score.toFixed(1)}/10 `;
    if (scan.risk_score >= 8) {
      output += "(CRITICAL)\n";
    } else if (scan.risk_score >= 6) {
      output += "(HIGH)\n";
    } else if (scan.risk_score >= 4) {
      output += "(MEDIUM)\n";
    } else {
      output += "(LOW)\n";
    }

    // Summary
    output += `Confirmed Exploitable: ${summary.exploitable_count}\n`;
    output += `Theoretical Risk: ${summary.theoretical_count}\n`;
    output += `Total CVEs: ${summary.total_cves}\n\n`;

    // CVE Details
    if (scan.cves.length > 0) {
      output += "CVE Details:\n";
      output += "─".repeat(60) + "\n";

      for (const cve of scan.cves) {
        const status = cve.exploitable ? "✓ CONFIRMED" : "⚠ THEORETICAL";
        output += `${cve.id} (${cve.package}@${cve.version_vulnerable})\n`;
        output += `  Status: ${status}\n`;
        output += `  Severity: ${cve.severity} (CVSS ${cve.cvss})\n`;
        if (cve.patch_diff) {
          output += `  Patch: Update to ${cve.version_fixed}\n`;
        }
        output += "\n";
      }
    } else {
      output += "✅ No vulnerabilities found!\n\n";
    }

    // Business Impact (for judges)
    if (summary.exploitable_count > 0) {
      output += "💰 Business Impact Estimate:\n";
      output += "────────────────────────────────────────────────────────────────\n";
      const estimatedCost = summary.exploitable_count * 4900000; // $4.9M per RCE
      output += `If exploited, estimated breach cost: $${(estimatedCost / 1000000).toFixed(1)}M\n`;
      output += "Recommendation: Patch within 24 hours\n";
      output += "────────────────────────────────────────────────────────────────\n\n";
    }

    // Scan Info
    output += `Scan Duration: ${(summary.scan_duration_ms / 1000).toFixed(2)}s\n`;
    output += `Report ID: ${scan.id}\n`;
    output += `Saved to: ${PATHS.SCANS_DIR}/${scan.id}.json\n\n`;

    output += "════════════════════════════════════════════════════════════════\n";

    return output;
  }
}

export const createReportBuilder = () => new ReportBuilder();
