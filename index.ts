import { createEngine } from "./src/engine/index";

const engine = createEngine();
const repoPath = process.argv[2] || "./demo-vulnerable-app";

console.log(`\n⚡ CodeProbe v1.0.0`);
console.log(`Scanning repository: ${repoPath}\n`);

try {
  const report = await engine.scan(repoPath);
  const formatted = (await import("./src/engine/report")).createReportBuilder().formatForTerminal(report);
  console.log(formatted);

  // Exit with appropriate code
  process.exit(report.summary.exploitable_count > 0 ? 1 : 0);
} catch (error) {
  console.error("❌ Scan failed:", error instanceof Error ? error.message : String(error));
  process.exit(2);
}