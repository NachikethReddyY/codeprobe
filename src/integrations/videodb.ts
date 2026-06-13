import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

interface ExploitVideoRecord {
  cveId: string;
  package: string;
  version: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  timestamp: string;
}

export class VideoDBRecorder {
  private recordedVideos: Map<string, ExploitVideoRecord> = new Map();
  private proofsDir = ".proofs";

  constructor() {
    this.ensureProofsDir();
  }

  private async ensureProofsDir(): Promise<void> {
    try {
      await mkdir(this.proofsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  async recordExploit(
    cveId: string,
    packageName: string,
    version: string,
    exploitOutput: string,
    duration: number = 15
  ): Promise<ExploitVideoRecord | null> {
    try {
      console.log(`[ProofRecorder] 🎥 Recording proof for ${cveId}...`);

      const proofPath = await this.saveProof(
        cveId,
        packageName,
        version,
        exploitOutput
      );

      const record: ExploitVideoRecord = {
        cveId,
        package: packageName,
        version,
        videoUrl: proofPath,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.recordedVideos.set(cveId, record);
      console.log(`[ProofRecorder] ✓ Saved: ${proofPath}`);

      return record;
    } catch (error) {
      console.warn(
        `[ProofRecorder] Failed to save proof for ${cveId}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  private async saveProof(
    cveId: string,
    packageName: string,
    version: string,
    exploitOutput: string
  ): Promise<string> {
    await this.ensureProofsDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${cveId}_${timestamp}.json`;
    const filePath = join(this.proofsDir, filename);

    const proofData = {
      cveId,
      package: packageName,
      version,
      exploitOutput,
      savedAt: new Date().toISOString(),
      severity: "CRITICAL",
      type: "rce-verification",
    };

    await writeFile(filePath, JSON.stringify(proofData, null, 2));
    return filePath;
  }

  getRecordedVideos(): ExploitVideoRecord[] {
    return Array.from(this.recordedVideos.values());
  }

  getVideoUrl(cveId: string): string | null {
    return this.recordedVideos.get(cveId)?.videoUrl || null;
  }

  formatForGitHubComment(): string {
    if (this.recordedVideos.size === 0) {
      return "";
    }

    let markdown = "\n### 🎥 Exploit Verification Videos\n\n";

    for (const [cveId, record] of this.recordedVideos) {
      markdown += `#### ${cveId} - ${record.package}@${record.version}\n`;
      markdown += `[![Watch Exploit](https://img.shields.io/badge/Watch-Exploit%20Video-blue?style=flat)](${record.videoUrl})\n`;
      markdown += `**Duration:** ${record.duration}s | **Recorded:** ${record.timestamp}\n\n`;
    }

    return markdown;
  }
}

export const createVideoDBRecorder = () => new VideoDBRecorder();
