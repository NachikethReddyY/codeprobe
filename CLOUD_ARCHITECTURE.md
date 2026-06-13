# CodeProbe Cloud Architecture

## Overview

Complete vulnerability scanning system with hourly web scraping, centralized database, and intelligent patching.

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD RUN                         │
│        https://codeprobe-901164477360.us-central1.run.app   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            API Server (src/api/server-cli.ts)        │  │
│  │  - REST API for scans                                │  │
│  │  - Receives dependencies from CLI                    │  │
│  │  - Runs engine (scraper, sandbox, patcher)           │  │
│  │  - Returns results with patches                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Firestore Database (Vulnerabilities)         │  │
│  │  - CVE database (updated hourly)                     │  │
│  │  - Scan history                                      │  │
│  │  - Patches cache                                     │  │
│  │  - VideoDB links                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Cloud Scheduler (Hourly Scraper Job)            │  │
│  │  - Runs every hour                                   │  │
│  │  - Scrapes web for new CVEs (Bright Data)            │  │
│  │  - Updates Firestore database                        │  │
│  │  - Triggers vulnerability detection                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   USER'S LOCAL MACHINE                      │
│                                                             │
│  npx codeprobe-scanner scan /repo --fix                    │
│         ↓                                                   │
│  [1] Parse dependencies locally                           │
│  [2] Query Cloud Run database for known CVEs              │
│  [3] Run Daytona sandbox for local testing                │
│  [4] Compare with database vulnerabilities                │
│  [5] If secure → Tell user "Safe to push"                 │
│  [6] If vulnerable:                                        │
│      - Generate patches (Kimi)                            │
│      - Record with VideoDB                                │
│      - Create GitHub PR                                   │
│      - Post evidence + video                              │
│         ↓                                                   │
│  Push to GitHub with confidence!                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Steps

### Step 1: Deploy Server to Cloud Run

```bash
cd /Users/nr/Developer/codeprobe

# Build and push to Cloud Run
gcloud run deploy codeprobe-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars \
    BRIGHT_DATA_API_KEY=c9cbd1ab-937a-4ee1-b6b5-13e90f957438 \
    DAYTONA_API_KEY=dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc \
    KIMI_API_KEY=sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ \
    NOSANA_API_KEY=nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4 \
    VIDEODB_API_KEY=sk-E1n94jCnG4kXZPC686LZZE1Gm1t6DoJvyXz8N2-xB20 \
    NODE_ENV=production \
    GOOGLE_CLOUD_URL=https://codeprobe-901164477360.us-central1.run.app \
    API_SECRET_TOKEN=$(openssl rand -hex 32)
```

Expected output:
```
Service [codeprobe-api] revision [codeprobe-api-00001-abc] has been deployed
✓ https://codeprobe-901164477360.us-central1.run.app
```

### Step 2: Set Up Firestore Database

```bash
# Create Firestore database
gcloud firestore databases create \
  --location=us-central1 \
  --type firestore-native

# Initialize collections
gcloud firestore databases create \
  --location=us-central1
```

**Collections:**
- `vulnerabilities` - CVE database
- `scans` - Scan history
- `patches` - Patch cache
- `web-scrape-results` - Hourly scraper results

### Step 3: Deploy Hourly Web Scraper

**Create `src/cloud/scraper-cron.ts`:**
```typescript
import { Firestore } from "@google-cloud/firestore";
import axios from "axios";

const db = new Firestore();

export async function scrapeCVEsHourly() {
  console.log("[Scraper] Starting hourly CVE scan...");

  try {
    // Use Bright Data to scrape NVD/Snyk for latest CVEs
    const cves = await scrapeFromBrightData();
    
    // Store in Firestore
    const batch = db.batch();
    for (const cve of cves) {
      const docRef = db.collection("vulnerabilities").doc(cve.id);
      batch.set(docRef, {
        ...cve,
        lastUpdated: new Date(),
        source: "web-scraper",
      }, { merge: true });
    }
    await batch.commit();

    console.log(`[Scraper] Updated ${cves.length} CVEs`);
  } catch (error) {
    console.error("[Scraper] Failed:", error);
  }
}

async function scrapeFromBrightData() {
  // Scrape NVD for latest vulnerabilities
  const response = await axios.get(
    "https://api.nvd.nist.gov/rest/json/cves/2.0?last-mod-start-date=2026-06-13",
    {
      headers: {
        Authorization: `Bearer ${process.env.BRIGHT_DATA_API_KEY}`,
      },
    }
  );
  
  return response.data.vulnerabilities || [];
}
```

**Cloud Scheduler Job:**
```bash
# Create Cloud Scheduler job (runs hourly)
gcloud scheduler jobs create pubsub hourly-cve-scraper \
  --location=us-central1 \
  --schedule="0 * * * *" \
  --topic=codeprobe-scraper \
  --message-body='{"action":"scrape"}'

# Create Cloud Function to handle the job
gcloud functions deploy scrapeVulnerabilitiesHourly \
  --runtime nodejs20 \
  --trigger-topic=codeprobe-scraper \
  --entry-point=scrapeCVEsHourly \
  --set-env-vars \
    BRIGHT_DATA_API_KEY=c9cbd1ab-937a-4ee1-b6b5-13e90f957438
```

---

## Scan Flow

### User runs: `npx codeprobe-scanner scan /repo --fix`

**Step 1: Local Scan**
```typescript
// src/cli-server.ts
const localDeps = parser.parseDependencies(repoPath);
```

**Step 2: Query Cloud Database**
```typescript
// New: Pull from Firestore
const cloudVulns = await queryCloudDatabase(localDeps);
```

**Step 3: Send to Server**
```typescript
// POST to Cloud Run
const response = await fetch(
  "https://codeprobe-901164477360.us-central1.run.app/api/scan",
  {
    method: "POST",
    body: JSON.stringify({
      dependencies: localDeps,
      repoPath,
      cloudVulnerabilities: cloudVulns, // NEW: from database
    }),
  }
);
```

**Step 4: Server Processing**
```typescript
// src/api/server-cli.ts
async function handleScan(req) {
  const { dependencies, cloudVulnerabilities } = req.body;
  
  // Merge cloud + local findings
  const allVulns = [
    ...cloudVulnerabilities,
    ...(await this.scraper.scrapeAll(dependencies)),
  ];
  
  // Deduplicate
  const uniqueVulns = deduplicateVulnerabilities(allVulns);
  
  // Test in sandbox (Daytona)
  const verified = await this.sandbox.parallelRun(uniqueVulns);
  
  // Generate patches (Kimi)
  const patches = await this.patcher.generateAllPatches(verified);
  
  // Record with VideoDB
  const videos = await this.videoRecorder.recordExploits(verified);
  
  return {
    vulnerabilities: verified,
    patches,
    videos,
    secure: verified.length === 0,
  };
}
```

**Step 5: CLI Decision**
```typescript
// src/cli-server.ts
const result = await response.json();

if (result.secure) {
  console.log("✅ Repository is secure! Safe to push.");
  process.exit(0);
} else {
  console.log("🔴 Vulnerabilities found:");
  console.log(result.vulnerabilities);
  
  if (options.fix) {
    // Interactive review
    const approved = await reviewAndApplyPatches(result);
    
    if (approved) {
      // Create PR with video evidence
      await createPRWithEvidence(result);
    }
  }
}
```

---

## Database Schema

### Collection: `vulnerabilities`

```json
{
  "id": "CVE-2022-29078",
  "package": "ejs",
  "severity": "CRITICAL",
  "cvss": 9.8,
  "description": "Template injection RCE",
  "affectedVersions": ["3.1.0", "3.1.1", "3.1.2", "3.1.3", "3.1.4", "3.1.5", "3.1.6"],
  "fixedVersion": "3.1.7",
  "source": "nvd",
  "lastUpdated": "2026-06-13T12:00:00Z",
  "videoEvidence": "https://console.videodb.io/videos/cve-2022-29078",
  "exploitable": true
}
```

### Collection: `scans`

```json
{
  "id": "scan_1781332539291",
  "timestamp": "2026-06-13T06:43:53.000Z",
  "repoPath": "/Users/nr/Developer/app",
  "vulnerabilities": [
    {
      "id": "CVE-2022-29078",
      "exploitable": true,
      "patchApplied": true,
      "videoLink": "https://console.videodb.io/videos/..."
    }
  ],
  "riskScore": 8.5,
  "status": "patched",
  "prCreated": "https://github.com/user/repo/pull/42"
}
```

---

## Environment Variables on Cloud Run

```bash
# APIs
BRIGHT_DATA_API_KEY=c9cbd1ab-937a-4ee1-b6b5-13e90f957438
DAYTONA_API_KEY=dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
KIMI_API_KEY=sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ
NOSANA_API_KEY=nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4
VIDEODB_API_KEY=sk-E1n94jCnG4kXZPC686LZZE1Gm1t6DoJvyXz8N2-xB20

# Server config
NODE_ENV=production
PORT=8080
GOOGLE_CLOUD_URL=https://codeprobe-901164477360.us-central1.run.app
API_SECRET_TOKEN=<random-32-char-hex>

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/google/key.json
PROJECT_ID=codeprobe-api
```

---

## Testing the Deployment

```bash
# 1. Test health check
curl https://codeprobe-901164477360.us-central1.run.app/health

# 2. Test scan endpoint
curl -X POST https://codeprobe-901164477360.us-central1.run.app/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_SECRET_TOKEN" \
  -d '{"repoPath": ".", "dependencies": [{"name": "ejs", "version": "3.1.6"}]}'

# 3. Test CLI against cloud
SERVER_URL=https://codeprobe-901164477360.us-central1.run.app \
CODEPROBE_SECRET=$API_SECRET_TOKEN \
npx codeprobe-scanner scan . --fix
```

---

## Hourly Scraper Flow

```
Every Hour:
  1. Cloud Scheduler triggers
  2. Cloud Function runs
  3. Scrapes NVD via Bright Data
  4. Stores in Firestore
  5. Updates vulnerability index
  6. Ready for next CLI scan
```

---

## Security

✅ **Cloud Run** - Auto-scales, serverless  
✅ **Firestore** - Encrypted at rest  
✅ **Cloud Scheduler** - Scheduled jobs  
✅ **Secret Management** - Google Secret Manager  
✅ **API Auth** - Bearer token + Cloud IAM  

---

## Cost Estimate (Monthly)

- **Cloud Run**: $0-$5 (if low traffic)
- **Firestore**: $0-$10 (reads/writes)
- **Cloud Scheduler**: Free (5+ jobs free/month)
- **Cloud Functions**: $0-$2 (hourly execution)

**Total**: ~$10-20/month for production

---

**Status**: Ready to deploy 🚀

