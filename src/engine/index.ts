import { createParser } from "./parser";
import { createScraper } from "./scraper";
import { createSandbox } from "./sandbox";
import { createMatcher } from "./matcher";
import { createPatcher } from "./patcher";
import { createReportBuilder } from "./report";
import { Report } from "../shared/types";

export class CodeProbeEngine {
  private parser = createParser();
  private scraper = createScraper();
  private sandbox = createSandbox();
  private matcher = createMatcher();
  private patcher = createPatcher();
  private reportBuilder = createReportBuilder();

  async scan(repoPath: string): Promise<Report> {
    const startTime = Date.now();

    try {
      // Step 1: Parse dependencies
      console.log("📦 Parsing dependencies...");
      const dependencies = await this.parser.parseDependencies(repoPath);
      console.log(`   Found ${dependencies.length} dependencies`);

      // Step 2: Scrape CVEs
      console.log("🔍 Scraping CVE data...");
      const cves = await this.scraper.scrapeAll(dependencies);
      console.log(`   Found ${cves.length} CVEs`);

      // Step 3: Match dependencies to CVEs
      console.log("🎯 Matching dependencies to CVEs...");
      const matchedCves = this.matcher.matchDependenciesToCVEs(dependencies, cves);
      console.log(`   Matched ${matchedCves.length} CVEs`);

      // Step 4: Filter CRITICAL/HIGH for sandbox verification
      const criticalCves = this.matcher.filterBySeverity(matchedCves, "HIGH");
      console.log(`   Testing ${criticalCves.length} critical/high severity CVEs...`);

      // Step 5: Run exploit verification in sandboxes
      const exploits = criticalCves.map((cve) => ({
        packageName: cve.package,
        version: cve.version_vulnerable,
        cveId: cve.id,
      }));

      const sandboxResults = await this.sandbox.parallelRun(exploits);

      // Step 6: Update CVEs with sandbox results
      for (const cve of matchedCves) {
        const sandboxResult = sandboxResults.get(cve.id);
        if (sandboxResult) {
          cve.exploitable = sandboxResult.success;
          cve.exploit_evidence = sandboxResult.stdout;
          cve.verification_time_ms = sandboxResult.time_ms;
        }
      }

      // Step 7: Generate patches
      console.log("🔧 Generating patches...");
      await this.patcher.loadPrebakedPatches();
      const patches = await this.patcher.generateAllPatches(matchedCves.filter((c) => c.exploitable));
      for (const cve of matchedCves) {
        if (patches.has(cve.id)) {
          cve.patch_diff = patches.get(cve.id);
        }
      }

      // Step 8: Calculate risk score
      const riskScore = this.matcher.calculateRiskScore(matchedCves);

      // Step 9: Build and save report
      const scanDuration = Date.now() - startTime;
      const report = await this.reportBuilder.buildReport(repoPath, matchedCves, riskScore, scanDuration, dependencies.length);

      await this.reportBuilder.saveReport(report);

      return report;
    } catch (error) {
      throw new Error(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const createEngine = () => new CodeProbeEngine();
