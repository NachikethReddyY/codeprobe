#!/usr/bin/env bun
// CodeProbe Scraper Cron - Hourly dependency change detector

import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CODEPROBE_DIR = path.join(process.env.HOME || process.env.USERPROFILE || "/tmp", ".codeprobe");
const HASH_FILE = path.join(CODEPROBE_DIR, "last-scan-hash.txt");
const SERVER_URL = process.env.CODEPROBE_SERVER_URL || "http://localhost:3000";

async function computeDependencyHash(): Promise<string> {
  const lockfiles = ["package-lock.json", "bun.lock", "yarn.lock", "pnpm-lock.yaml"];
  let lockfileContent = "";

  for (const name of lockfiles) {
    const filePath = path.join(process.cwd(), name);
    if (existsSync(filePath)) {
      lockfileContent = await Bun.file(filePath).text();
      break;
    }
  }

  const packagePath = path.join(process.cwd(), "package.json");
  let packageContent = "";
  if (existsSync(packagePath)) {
    packageContent = await Bun.file(packagePath).text();
  }

  const combined = packageContent + lockfileContent;
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(combined);
  return hasher.digest("hex");
}

async function getStoredHash(): Promise<string | null> {
  try {
    if (existsSync(HASH_FILE)) {
      return (await Bun.file(HASH_FILE).text()).trim();
    }
  } catch (error) {
    console.warn("[Scraper] Failed to read hash:", error instanceof Error ? error.message : "unknown");
  }
  return null;
}

async function saveHash(hash: string): Promise<void> {
  if (!existsSync(CODEPROBE_DIR)) {
    await mkdir(CODEPROBE_DIR, { mode: 0o700, recursive: true });
  }
  await writeFile(HASH_FILE, hash, "utf-8");
}

async function triggerScan(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoPath: "." }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`[Scraper] Server error: ${response.status}`);
      return false;
    }

    const result = await response.json();
    console.log(`[Scraper] Scan triggered (ID: ${result.scanId})`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Scraper] Failed: ${msg}`);
    return false;
  }
}

async function main(): Promise<void> {
  try {
    const currentHash = await computeDependencyHash();
    const storedHash = await getStoredHash();

    if (storedHash === currentHash) {
      console.log("[Scraper] Dependencies unchanged, skipping scan");
      process.exit(0);
    }

    console.log("[Scraper] New packages detected, scanning...");

    const success = await triggerScan();
    if (success) {
      await saveHash(currentHash);
    } else {
      console.warn("[Scraper] Trigger failed, will retry next hour");
      process.exit(1);
    }
  } catch (error) {
    console.error("[Scraper] Fatal:", error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

main();
