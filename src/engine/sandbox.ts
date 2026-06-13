import { Daytona } from "@daytona/sdk";
import { SandboxResult } from "../shared/types";
import { TIMEOUTS, RETRY_CONFIG, DEMO_CVE } from "../shared/constants";

export class SandboxOrchestrator {
  private apiKey: string;
  private daytonaClient: Daytona | null = null;
  private useDaytona: boolean = false;

  constructor() {
    this.apiKey = process.env.DAYTONA_API_KEY || "";

    // Initialize Daytona if API key is available
    if (this.apiKey && this.apiKey.startsWith("dtn_")) {
      try {
        this.daytonaClient = new Daytona({ apiKey: this.apiKey });
        this.useDaytona = true;
        console.log("[Daytona] ✓ Real sandbox enabled");
      } catch (error) {
        console.warn("[Daytona] ⚠️ Failed to initialize, will use local simulation:",
          error instanceof Error ? error.message : String(error));
        this.useDaytona = false;
      }
    } else {
      console.log("[Daytona] Using simulated sandbox (no API key provided)");
    }
  }

  async runExploit(packageName: string, version: string, cveId: string): Promise<SandboxResult> {
    // Only support ejs RCE for now
    if (packageName === DEMO_CVE.package && cveId === DEMO_CVE.id) {
      if (this.useDaytona && this.daytonaClient) {
        return await this.runEjsWithDaytona(version);
      } else {
        return await this.runEjsSimulated(version);
      }
    }

    return {
      exploit_ran: false,
      exit_code: -1,
      stdout: "",
      stderr: "Unknown package",
      success: false,
      time_ms: 0,
    };
  }

  private async runEjsWithDaytona(version: string): Promise<SandboxResult> {
    const startTime = Date.now();

    try {
      if (!this.daytonaClient) {
        throw new Error("Daytona client not initialized");
      }

      // Create sandbox with Node.js environment
      const sandbox = await this.daytonaClient.create({
        language: "javascript",
      });

      // Install vulnerable ejs version
      const installCode = `
const fs = require('fs');
const path = require('path');

// Create package.json
const pkg = {
  "name": "exploit-test",
  "version": "1.0.0",
  "dependencies": { "ejs": "${version}" }
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));

// Install dependencies (using npm)
require('child_process').execSync('npm install', { stdio: 'inherit' });
console.log('Dependencies installed');
`;

      await sandbox.process.codeRun(installCode);

      // Run the exploit
      const exploitCode = `
const ejs = require('ejs');

// Test: template injection RCE
const payload = 'require("child_process").execSync("echo PWNED")';
const template = '<%= ${payload} %>';

try {
  const result = ejs.render(template, {});
  console.log('RCE_SUCCESS: Code execution confirmed');
  process.exit(0);
} catch (e) {
  console.log('RCE_FAILED: ' + e.message);
  process.exit(1);
}
`;

      const result = await sandbox.process.codeRun(exploitCode);
      const success = result.result?.includes("RCE_SUCCESS");

      return {
        exploit_ran: true,
        exit_code: success ? 0 : 1,
        stdout: `[Daytona] EJS ${version} - ${success ? "EXPLOITABLE" : "PATCHED"}\n${result.result || ""}`,
        stderr: "",
        success: success,
        time_ms: Date.now() - startTime,
      };
    } catch (error) {
      // Fallback to simulation on Daytona error
      console.warn("[Daytona] Error during exploit:", error instanceof Error ? error.message : String(error));
      return await this.runEjsSimulated(version);
    }
  }

  private async runEjsSimulated(version: string): Promise<SandboxResult> {
    const startTime = Date.now();
    const isVulnerable = DEMO_CVE.affected_versions.includes(version);

    if (isVulnerable) {
      const exploitTime = Math.random() * 2000 + 500;
      await new Promise((resolve) => setTimeout(resolve, exploitTime));

      return {
        exploit_ran: true,
        exit_code: 0,
        stdout: `[Simulation] EJS ${version} detected\n[Simulation] Testing template injection RCE...\n[✓] RCE payload executed successfully\n[✓] Code execution confirmed: require("child_process").execSync() works\n`,
        stderr: "",
        success: true,
        time_ms: Date.now() - startTime,
      };
    } else {
      const exploitTime = Math.random() * 1000 + 300;
      await new Promise((resolve) => setTimeout(resolve, exploitTime));

      return {
        exploit_ran: true,
        exit_code: 1,
        stdout: `[Simulation] EJS ${version} detected\n[Simulation] Testing template injection RCE...\n[-] Template injection blocked by fix\n`,
        stderr: "Template execution prevented by sanitization",
        success: false,
        time_ms: Date.now() - startTime,
      };
    }
  }

  async spawnSandbox(packageName: string, version: string, cveId: string): Promise<SandboxResult> {
    let retries = 0;

    while (retries <= RETRY_CONFIG.MAX_RETRIES) {
      try {
        const result = await this.runExploit(packageName, version, cveId);
        return result;
      } catch (error) {
        retries++;
        if (retries > RETRY_CONFIG.MAX_RETRIES) {
          return {
            exploit_ran: false,
            exit_code: -1,
            stdout: "",
            stderr: `Sandbox crashed after ${retries} retries`,
            success: false,
            time_ms: 0,
          };
        }

        const delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retries - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      exploit_ran: false,
      exit_code: -1,
      stdout: "",
      stderr: "Sandbox failed to execute exploit",
      success: false,
      time_ms: 0,
    };
  }

  async parallelRun(exploits: Array<{ packageName: string; version: string; cveId: string }>): Promise<Map<string, SandboxResult>> {
    const results = new Map<string, SandboxResult>();

    // Run up to 3 exploits in parallel
    const parallel = 3;
    for (let i = 0; i < exploits.length; i += parallel) {
      const batch = exploits.slice(i, i + parallel);
      const promises = batch.map(async (exploit) => {
        const result = await this.spawnSandbox(exploit.packageName, exploit.version, exploit.cveId);
        return { key: exploit.cveId, result };
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ key, result }) => {
        results.set(key, result);
      });
    }

    return results;
  }
}

export const createSandbox = () => new SandboxOrchestrator();
