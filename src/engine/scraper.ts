import axios from "axios";
import { CVE, ScrapeResult } from "../shared/types";
import { API_ENDPOINTS, TIMEOUTS, PATHS, DEMO_CVE } from "../shared/constants";

export class CVEScraper {
  private apiKey: string;
  private cache: Map<string, CVE> = new Map();

  constructor() {
    this.apiKey = process.env.BRIGHT_DATA_API_KEY || "";
  }

  async scrapeForCVEs(packageName: string, version: string): Promise<CVE[]> {
    // For MVP, we'll focus on the demo CVE (ejs)
    if (packageName === DEMO_CVE.package) {
      return [this.buildDemoCVE()];
    }

    // For other packages, try to fetch from Bright Data or use fallback
    try {
      return await this.fetchFromBrightData(packageName, version);
    } catch (error) {
      console.warn(`Bright Data fetch failed for ${packageName}: using cache`);
      return await this.loadFromCache();
    }
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
      exploit_url: "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-29078",
    };
  }

  private async fetchFromBrightData(packageName: string, version: string): Promise<CVE[]> {
    try {
      // Use Bright Data Scraper API with Bearer token authentication
      // For NVD data, we'll use the public NVD API endpoint with Bright Data proxy/unblocking
      console.log(`[Bright Data] Scraping ${packageName} from NVD...`);

      const response = await axios.get(
        `${API_ENDPOINTS.NVD}?keyword=${packageName}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Accept": "application/json",
          },
          timeout: TIMEOUTS.BRIGHT_DATA_SCRAPE,
        }
      );

      if (response.data?.vulnerabilities && Array.isArray(response.data.vulnerabilities)) {
        return response.data.vulnerabilities
          .filter((vuln: any) => {
            const affectedProducts = vuln.cve?.configurations?.[0]?.nodes?.flatMap((n: any) =>
              n.cpeMatch?.map((m: any) => m.criteria) || []
            ) || [];
            return affectedProducts.some((p: string) => p?.includes(packageName));
          })
          .map((vuln: any) => {
            const descriptions = vuln.cve?.descriptions || [];
            return {
              id: vuln.id,
              package: packageName,
              affected_versions: [version],
              fixed_version: "",
              severity: vuln.impact?.baseSeverity || "MEDIUM",
              cvss: vuln.impact?.baseScore || 5.0,
              description: descriptions[0]?.value || "",
              cwe: vuln.cve?.weaknesses?.[0]?.source || "",
              exploit_url: `https://nvd.nist.gov/vuln/detail/${vuln.id}`,
            };
          })
          .slice(0, 5); // Limit to top 5 results
      }

      return [];
    } catch (error) {
      // Bright Data failed, will fall back to cache
      console.warn(`[Bright Data] Scraping failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Bright Data API call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadFromCache(): Promise<CVE[]> {
    try {
      const cacheFile = Bun.file(PATHS.CACHE_FILE);
      const exists = await cacheFile.exists();

      if (exists) {
        const content = await cacheFile.text();
        const cacheData = JSON.parse(content);
        return cacheData.cves || [];
      }
    } catch (error) {
      console.warn("Failed to load CVE cache:", error);
    }

    // Return at least the demo CVE
    return [this.buildDemoCVE()];
  }

  async scrapeAll(dependencies: Array<{ name: string; version: string }>): Promise<CVE[]> {
    const allCVEs: CVE[] = [];

    for (const dep of dependencies) {
      const cves = await this.scrapeForCVEs(dep.name, dep.version);
      allCVEs.push(...cves);
    }

    return allCVEs;
  }
}

export const createScraper = () => new CVEScraper();
