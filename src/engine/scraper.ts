import axios from "axios";
import { CVE } from "../shared/types";
import { DEMO_CVE } from "../shared/constants";

const OSV_API = "https://api.osv.dev/v1";
const GITHUB_ADVISORY_API = "https://api.github.com/advisories";

export interface ThreatIntel {
  id: string;
  title: string;
  severity: string;
  packages: string[];
  published: string;
  url: string;
  summary: string;
}

export class CVEScraper {
  // Query OSV.dev — exact package+version match, no false positives
  private async queryOSV(packageName: string, version: string): Promise<CVE[]> {
    try {
      const response = await axios.post(
        `${OSV_API}/query`,
        {
          package: { name: packageName, ecosystem: "npm" },
          version,
        },
        { timeout: 10000, headers: { "Content-Type": "application/json" } }
      );

      const vulns = response.data?.vulns;
      if (!Array.isArray(vulns)) return [];

      return vulns.map((v: any) => {
        const severity = v.severity?.[0]?.score || v.database_specific?.severity || "MEDIUM";
        const cvss = typeof severity === "number" ? severity : this.severityToScore(severity);
        const aliases: string[] = v.aliases || [];
        const cveId = aliases.find((a: string) => a.startsWith("CVE-")) || v.id;

        return {
          id: cveId,
          package: packageName,
          affected_versions: [version],
          fixed_version: this.extractFixedVersion(v, packageName),
          severity: this.normalizeSeverity(severity),
          cvss,
          description: v.details || v.summary || "",
          cwe: v.database_specific?.cwe_ids?.[0] || "",
          exploit_url: `https://osv.dev/vulnerability/${v.id}`,
        } as CVE;
      });
    } catch {
      return [];
    }
  }

  // Fetch recent npm security threats from GitHub Advisory Database
  async fetchRecentThreats(): Promise<ThreatIntel[]> {
    try {
      const response = await axios.get(GITHUB_ADVISORY_API, {
        params: {
          ecosystem: "npm",
          per_page: 10,
          sort: "published",
          direction: "desc",
        },
        timeout: 10000,
        headers: { Accept: "application/vnd.github+json" },
      });

      return (response.data || []).map((a: any) => ({
        id: a.ghsa_id,
        title: a.summary || a.ghsa_id,
        severity: a.severity?.toUpperCase() || "UNKNOWN",
        packages: (a.vulnerabilities || []).map((v: any) => v.package?.name).filter(Boolean),
        published: a.published_at,
        url: a.html_url || `https://github.com/advisories/${a.ghsa_id}`,
        summary: a.description?.substring(0, 200) || "",
      }));
    } catch {
      return [];
    }
  }

  async scrapeForCVEs(packageName: string, version: string): Promise<CVE[]> {
    if (packageName === DEMO_CVE.package) {
      return [this.buildDemoCVE()];
    }
    return await this.queryOSV(packageName, version);
  }

  async scrapeAll(
    dependencies: Array<{ name: string; version: string }>
  ): Promise<CVE[]> {
    const results = await Promise.all(
      dependencies.map(dep => this.scrapeForCVEs(dep.name, dep.version))
    );
    const seen = new Set<string>();
    const allCVEs: CVE[] = [];
    for (const cves of results) {
      for (const cve of cves) {
        if (!seen.has(cve.id)) {
          seen.add(cve.id);
          allCVEs.push(cve);
        }
      }
    }
    return allCVEs;
  }

  private buildDemoCVE(): CVE {
    return {
      id: DEMO_CVE.id,
      package: DEMO_CVE.package,
      affected_versions: DEMO_CVE.affected_versions,
      fixed_version: DEMO_CVE.fixed_version,
      severity: DEMO_CVE.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      cvss: DEMO_CVE.cvss,
      description: DEMO_CVE.description,
      cwe: "CWE-94",
      exploit_url: `https://nvd.nist.gov/vuln/detail/${DEMO_CVE.id}`,
    };
  }

  private extractFixedVersion(vuln: any, packageName: string): string {
    const affected = vuln.affected || [];
    for (const a of affected) {
      if (a.package?.name === packageName) {
        for (const range of a.ranges || []) {
          for (const event of range.events || []) {
            if (event.fixed) return event.fixed;
          }
        }
      }
    }
    return "";
  }

  private normalizeSeverity(s: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    const upper = (s || "").toUpperCase();
    if (upper === "CRITICAL") return "CRITICAL";
    if (upper === "HIGH") return "HIGH";
    if (upper === "LOW") return "LOW";
    return "MEDIUM";
  }

  private severityToScore(s: string): number {
    const upper = (s || "").toUpperCase();
    if (upper === "CRITICAL") return 9.0;
    if (upper === "HIGH") return 7.5;
    if (upper === "LOW") return 3.0;
    return 5.0;
  }
}

export const createScraper = () => new CVEScraper();
