import { ScanCVE } from "../shared/types";
import { PATHS, DEMO_CVE } from "../shared/constants";
import axios from "axios";
import { getConfig } from "../cli/config.js";

interface PatchData {
  cve_id: string;
  package: string;
  from_version: string;
  to_version: string;
  diff: string;
  description: string;
}

export class PatchGenerator {
  private patches: Map<string, PatchData> = new Map();
  private kimiApiKey: string = "";
  private nosanaApiKey: string = "";

  private async resolveKeys(): Promise<void> {
    this.kimiApiKey = process.env.KIMI_API_KEY
      || (typeof await getConfig("kimi_api_key") === "string" ? await getConfig("kimi_api_key") as string : "");
    this.nosanaApiKey = process.env.NOSANA_API_KEY
      || (typeof await getConfig("nosana_api_key") === "string" ? await getConfig("nosana_api_key") as string : "");
  }

  async loadPrebakedPatches(): Promise<void> {
    try {
      const patchFile = Bun.file(PATHS.PATCHES_FILE);
      const exists = await patchFile.exists();

      if (exists) {
        const content = await patchFile.text();
        const patchData = JSON.parse(content);

        if (Array.isArray(patchData)) {
          for (const patch of patchData) {
            this.patches.set(patch.cve_id, patch);
          }
        }
      } else {
        // Load default patches
        this.loadDefaultPatches();
      }
    } catch (error) {
      console.warn("Failed to load prebaked patches, using defaults:", error);
      this.loadDefaultPatches();
    }
  }

  private loadDefaultPatches(): void {
    // Default patch for ejs CVE-2022-29078
    this.patches.set(DEMO_CVE.id, {
      cve_id: DEMO_CVE.id,
      package: DEMO_CVE.package,
      from_version: "3.1.6",
      to_version: "3.1.7",
      diff: `--- a/package.json
+++ b/package.json
@@ -5,1 +5,1 @@
-  "ejs": "3.1.6"
+  "ejs": "3.1.7"`,
      description: "Updates ejs to 3.1.7 which fixes template injection RCE vulnerability",
    });
  }

  async generatePatch(cve: ScanCVE): Promise<string | null> {
    await this.resolveKeys();

    const prebakedPatch = this.patches.get(cve.id);
    if (prebakedPatch) {
      cve.patch_diff = prebakedPatch.diff;
      return prebakedPatch.diff;
    }

    // Try Kimi LLM for patch generation
    if (this.kimiApiKey) {
      try {
        console.log(`[Kimi] Generating patch for ${cve.id}...`);
        const patch = await this.generatePatchWithKimi(cve);
        if (patch) {
          cve.patch_diff = patch;
          return patch;
        }
      } catch (error) {
        console.warn(`[Kimi] Failed to generate patch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Try Nosana LLM if Kimi failed
    if (this.nosanaApiKey) {
      try {
        console.log(`[Kimi] Generating patch for ${cve.id}...`);
        const patch = await this.generatePatchWithKimi(cve);
        if (patch) {
          cve.patch_diff = patch;
          return patch;
        }
      } catch (error) {
        console.warn(`[Kimi] Failed to generate patch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return null;
  }

  private async generatePatchWithKimi(cve: ScanCVE): Promise<string | null> {
    try {
      const prompt = `Generate a minimal security patch to fix ${cve.id} in ${cve.package}@${cve.version_vulnerable}.

The CVE is: ${cve.description}

Return ONLY a unified diff in this format:
--- a/package.json
+++ b/package.json
@@ -X,Y +X,Y @@
-"${cve.package}": "${cve.version_vulnerable}"
+"${cve.package}": "${cve.version_fixed || cve.version_vulnerable.replace(/(\d+)\.(\d+)\.(\d+)/, (_, a, b, c) => `${a}.${b}.${parseInt(c) + 1}`)}"

Include only the diff, no explanation.`;

      const response = await axios.post(
        "https://api.aimlapi.com/v1/chat/completions",
        {
          model: "moonshot/kimi-k2-5",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.kimiApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const patch = response.data?.choices?.[0]?.message?.content || null;
      return patch ? patch.trim() : null;
    } catch (error) {
      throw new Error(`Kimi API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generatePatchWithNosana(cve: ScanCVE): Promise<string | null> {
    try {
      // Nosana job submission
      const jobPayload = {
        ops: [
          {
            type: "exec",
            env: {
              CVE_ID: cve.id,
              PACKAGE: cve.package,
              VERSION: cve.version_vulnerable,
              FIXED_VERSION: cve.version_fixed || cve.version_vulnerable.replace(/(\d+)\.(\d+)\.(\d+)/, (_, a, b, c) => `${a}.${b}.${parseInt(c) + 1}`),
            },
            cmd: [
              "sh",
              "-c",
              `echo "--- a/package.json" && echo "+++ b/package.json" && echo "@@ -5,1 +5,1 @@" && echo "-  \\"$PACKAGE\\": \\"$VERSION\\"" && echo "+  \\"$PACKAGE\\": \\"$FIXED_VERSION\\""`,
            ],
          },
        ],
      };

      const response = await axios.post(
        "https://api.nosana.com/v1/jobs",
        jobPayload,
        {
          headers: {
            Authorization: `Bearer ${this.nosanaApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const jobId = response.data?.id;
      if (!jobId) {
        throw new Error("No job ID returned from Nosana");
      }

      // Poll for job completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const jobStatus = await axios.get(`https://api.nosana.com/v1/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${this.nosanaApiKey}`,
          },
          timeout: 10000,
        });

        if (jobStatus.data?.state === "completed") {
          const output = jobStatus.data?.results?.[0]?.output || "";
          return output ? output.trim() : null;
        }

        attempts++;
      }

      throw new Error("Nosana job timeout");
    } catch (error) {
      throw new Error(`Nosana API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateAllPatches(cves: ScanCVE[]): Promise<Map<string, string>> {
    const patches = new Map<string, string>();

    for (const cve of cves) {
      const patch = await this.generatePatch(cve);
      if (patch) {
        patches.set(cve.id, patch);
      }
    }

    return patches;
  }

  getPatch(cveId: string): PatchData | undefined {
    return this.patches.get(cveId);
  }

  async applyPatches(repoPath: string, patches: Map<string, string>): Promise<Map<string, { file: string; applied: boolean; error?: string }>> {
    const results = new Map<string, { file: string; applied: boolean; error?: string }>();

    for (const [cveId, diff] of patches) {
      try {
        const patchData = this.patches.get(cveId);
        if (!patchData) {
          results.set(cveId, { file: '', applied: false, error: 'No patch data found' });
          continue;
        }

        // For demo: simple version replacement in package.json
        // Parse package.json and update the vulnerable package version
        const packageJsonPath = `${repoPath}/package.json`;
        const packageFile = Bun.file(packageJsonPath);
        const exists = await packageFile.exists();

        if (!exists) {
          results.set(cveId, { file: packageJsonPath, applied: false, error: 'package.json not found' });
          continue;
        }

        const content = await packageFile.text();
        const packageJson = JSON.parse(content);

        // Update the package to the fixed version
        if (packageJson.dependencies && packageJson.dependencies[patchData.package]) {
          packageJson.dependencies[patchData.package] = `^${patchData.to_version}`;

          // Write the modified package.json
          await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));

          results.set(cveId, { file: 'package.json', applied: true });
        } else {
          results.set(cveId, { file: packageJsonPath, applied: false, error: `${patchData.package} not found in dependencies` });
        }
      } catch (error) {
        results.set(cveId, {
          file: '',
          applied: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}

export const createPatcher = () => new PatchGenerator();
