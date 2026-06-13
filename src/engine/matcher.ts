import { CVE, ScanCVE, DependencyMatch } from "../shared/types";
import { DEMO_CVE } from "../shared/constants";

export class CVEMatcher {
  matchDependenciesToCVEs(dependencies: DependencyMatch[], cves: CVE[]): ScanCVE[] {
    const matched: ScanCVE[] = [];

    for (const dep of dependencies) {
      for (const cve of cves) {
        if (this.isMatched(dep, cve)) {
          matched.push({
            id: cve.id,
            package: dep.name,
            version_vulnerable: dep.version,
            version_fixed: cve.fixed_version || undefined,
            severity: cve.severity,
            cvss: cve.cvss,
            description: cve.description,
            exploitable: false, // Will be set by sandbox verification
            verification_time_ms: 0,
          });
        }
      }
    }

    return matched;
  }

  private isMatched(dep: DependencyMatch, cve: CVE): boolean {
    // Check if package name matches
    if (dep.name !== cve.package) {
      return false;
    }

    // Check if version is in affected range
    return this.isVersionAffected(dep.version, cve.affected_versions);
  }

  private isVersionAffected(version: string, affectedVersions: string[]): boolean {
    // Simple version matching: exact match or version comparison
    const depVersion = this.normalizeVersion(version);

    for (const affected of affectedVersions) {
      const affectedVersion = this.normalizeVersion(affected);

      // Exact match
      if (depVersion === affectedVersion) {
        return true;
      }

      // Semantic versioning check
      if (this.isVersionInRange(depVersion, affectedVersion)) {
        return true;
      }
    }

    return false;
  }

  private normalizeVersion(version: string): string {
    // Remove npm version prefixes
    return version.replace(/^[\^~>=<]*/, "").trim();
  }

  private isVersionInRange(version: string, rangeStart: string): boolean {
    // Simple comparison: if both are like X.Y.Z, compare numerically
    const vParts = version.split(".").map(Number);
    const rParts = rangeStart.split(".").map(Number);

    for (let i = 0; i < Math.max(vParts.length, rParts.length); i++) {
      const v = vParts[i] || 0;
      const r = rParts[i] || 0;

      if (v < r) return false;
      if (v > r) return true;
    }

    return true; // Exact match
  }

  filterBySeverity(cves: ScanCVE[], minSeverity: string): ScanCVE[] {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const minLevel = severityOrder[minSeverity as keyof typeof severityOrder] || 0;

    return cves.filter((cve) => {
      const level = severityOrder[cve.severity as keyof typeof severityOrder] || 0;
      return level >= minLevel;
    });
  }

  calculateRiskScore(scanCves: ScanCVE[]): number {
    if (scanCves.length === 0) {
      return 0;
    }

    const severityWeight = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1 };
    const exploitableWeight = 2; // Confirmed exploitable counts double

    let totalScore = 0;

    for (const cve of scanCves) {
      const severityScore = severityWeight[cve.severity as keyof typeof severityWeight] || 0;
      const isExploitable = cve.exploitable ? exploitableWeight : 1;
      totalScore += severityScore * isExploitable;
    }

    // Normalize to 0-10 scale
    const maxScore = scanCves.length * 10 * exploitableWeight;
    const normalizedScore = Math.min(10, (totalScore / maxScore) * 10);

    return parseFloat(normalizedScore.toFixed(1));
  }
}

export const createMatcher = () => new CVEMatcher();
