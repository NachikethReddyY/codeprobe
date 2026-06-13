import { ScanCVE } from "../shared/types";
import { PATHS, DEMO_CVE } from "../shared/constants";

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
    // Try to get prebaked patch first
    const prebakedPatch = this.patches.get(cve.id);
    if (prebakedPatch) {
      cve.patch_diff = prebakedPatch.diff;
      return prebakedPatch.diff;
    }

    // For MVP, return null if no prebaked patch (LLM fallback would go here)
    return null;
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

  async applyPatches(patches: Map<string, string>): Promise<void> {
    // For CLI integration - would apply patches to actual files
    // This is called from Stage 2 (CLI) when --fix flag is used
    for (const [cveId, diff] of patches) {
      console.log(`Applying patch for ${cveId}...`);
      // Actual patch application happens in CLI with git integration
    }
  }
}

export const createPatcher = () => new PatchGenerator();
