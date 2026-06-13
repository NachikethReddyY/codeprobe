import { test, expect, beforeAll, afterAll } from "bun:test";
import { createEngine } from "../engine/index";
import { createParser } from "../engine/parser";
import { createScraper } from "../engine/scraper";
import { createMatcher } from "../engine/matcher";

let demoRepoPath: string;

beforeAll(async () => {
  // Create a demo repo with vulnerable ejs
  const tempDir = `/tmp/codeprobe-test-${Date.now()}`;

  // Create directory
  try {
    await Bun.$`mkdir -p ${tempDir}`;
  } catch {
    // Directory might already exist
  }

  const packageJson = {
    name: "test-app",
    version: "1.0.0",
    dependencies: {
      ejs: "3.1.6",
    },
  };

  await Bun.write(`${tempDir}/package.json`, JSON.stringify(packageJson, null, 2));

  // Create package-lock.json with exact version
  const lockfile = {
    name: "test-app",
    version: "1.0.0",
    dependencies: {
      ejs: {
        version: "3.1.6",
      },
    },
  };

  await Bun.write(`${tempDir}/package-lock.json`, JSON.stringify(lockfile, null, 2));

  demoRepoPath = tempDir;
});

test("Parser: extracts dependencies from package.json", async () => {
  const parser = createParser();
  const deps = await parser.parseDependencies(demoRepoPath);

  expect(deps).toHaveLength(1);
  expect(deps[0].name).toBe("ejs");
  expect(deps[0].version).toBe("3.1.6");
});

test("Scraper: returns demo CVE for ejs", async () => {
  const scraper = createScraper();
  const cves = await scraper.scrapeForCVEs("ejs", "3.1.6");

  expect(cves.length).toBeGreaterThan(0);
  expect(cves[0].id).toBe("CVE-2022-29078");
  expect(cves[0].package).toBe("ejs");
});

test("Matcher: matches ejs to CVE-2022-29078", async () => {
  const scraper = createScraper();
  const matcher = createMatcher();

  const deps = [{ name: "ejs", version: "3.1.6" }];
  const cves = await scraper.scrapeForCVEs("ejs", "3.1.6");

  const matched = matcher.matchDependenciesToCVEs(deps, cves);

  expect(matched.length).toBeGreaterThan(0);
  expect(matched[0].id).toBe("CVE-2022-29078");
  expect(matched[0].package).toBe("ejs");
});

test("Matcher: calculates risk score", async () => {
  const matcher = createMatcher();

  const cves = [
    {
      id: "CVE-2022-29078",
      package: "ejs",
      version_vulnerable: "3.1.6",
      version_fixed: "3.1.7",
      severity: "CRITICAL" as const,
      cvss: 9.8,
      description: "Template injection RCE",
      exploitable: true,
    },
  ];

  const riskScore = matcher.calculateRiskScore(cves);

  expect(riskScore).toBeGreaterThan(5);
  expect(riskScore).toBeLessThanOrEqual(10);
});

test("Engine: full scan end-to-end", async () => {
  const engine = createEngine();
  const report = await engine.scan(demoRepoPath);

  expect(report).toBeDefined();
  expect(report.scan.id).toBeDefined();
  expect(report.scan.cves.length).toBeGreaterThan(0);
  expect(report.scan.risk_score).toBeGreaterThan(0);
  expect(report.summary.total_cves).toBeGreaterThan(0);

  // Check for demo CVE
  const demoCveFound = report.scan.cves.find((c) => c.id === "CVE-2022-29078");
  expect(demoCveFound).toBeDefined();
  expect(demoCveFound?.package).toBe("ejs");

  // Verify exploit was run (vulnerable version should be exploitable)
  if (demoCveFound?.version_vulnerable === "3.1.6") {
    expect(demoCveFound?.exploitable).toBe(true);
  }
});

test("Engine: reports fixed version as not exploitable", async () => {
  const tempDir = `/tmp/codeprobe-test-fixed-${Date.now()}`;

  try {
    await Bun.$`mkdir -p ${tempDir}`;
  } catch {
    // OK
  }

  const packageJson = {
    name: "test-app-fixed",
    version: "1.0.0",
    dependencies: {
      ejs: "3.1.7",
    },
  };

  await Bun.write(`${tempDir}/package.json`, JSON.stringify(packageJson, null, 2));

  const engine = createEngine();
  const report = await engine.scan(tempDir);

  const demoCve = report.scan.cves.find((c) => c.id === "CVE-2022-29078");
  if (demoCve) {
    // Fixed version should not be exploitable
    expect(demoCve?.exploitable).toBe(false);
  }
});

afterAll(async () => {
  // Cleanup
  try {
    await Bun.$`rm -rf /tmp/codeprobe-test-*`;
  } catch {
    // Ignore cleanup errors
  }
});
