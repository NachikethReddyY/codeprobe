# CodeProbe Stage 2: Architecture & Dependency Graph

**Visual Overview of CLI + Verification System**

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INVOCATION                            │
│                  $ codeprobe scan <repo> [--fix]                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼────────┐      ┌────────▼──────────┐
            │ CLI Entry       │      │ Config System     │
            │ index.ts        │      │ config.ts         │
            │                 │      │                   │
            │ • Route args    │      │ • Load/save       │
            │ • Dispatch cmd  │      │ • Encrypt token   │
            │ • Exit codes    │      │ • Get API keys    │
            └────────┬────────┘      └──────────────────┘
                     │                       ▲
                     │                       │
        ┌────────────▼──────────────────────┘
        │
        │  ┌──────────────────────────────────────┐
        └─▶│ Commands Router                      │
           │                                      │
           ├─ scan.ts ──────────────────────────┐
           │   • Parse repo path                │
           │   • Call runFullScan()             │
           │   • Format output                  │
           │   • Save report                    │
           │                                    │
           ├─ scan-with-fix.ts ────────────────┐
           │   • Run scan first                 │
           │   • Extract CVEs                   │
           │   • Apply patches                  │
           │   • Create git branch              │
           │   • Commit + push                  │
           │                                    │
           └─ report.ts ──────────────────────┐
               • Read latest.json              │
               • Format as table               │
               • Export JSON/HTML              │
               │
               ├────────────────────────────────┤
               │                                │
        ┌──────▼───────┐            ┌─────────▼──────┐
        │ Progress      │            │ Errors         │
        │ progress.ts   │            │ errors.ts      │
        │               │            │                │
        │ • Event       │            │ • Catch        │
        │   listener    │            │   exceptions   │
        │ • Format      │            │ • Map to       │
        │   output      │            │   messages     │
        │ • Colors      │            │ • Fallback     │
        │ • Timestamps  │            │   triggers     │
        └───────┬───────┘            └────────┬──────┘
                │                            │
                └────────────┬───────────────┘
                             │
                    ┌────────▼────────────────┐
                    │  STAGE 1 ENGINE         │
                    │  (External Dependency)  │
                    │                         │
                    │  • runFullScan()        │
                    │  • Event Emitter        │
                    │  • Report Builder       │
                    │  • CVE Matcher          │
                    │  • Sandbox Orchestrator │
                    └────────┬────────────────┘
                             │
        ┌────────────────────┼───────────────────────┐
        │                    │                       │
        │          ┌─────────▼────────┐   ┌─────────▼────────┐
        │          │ Bright Data       │   │ Daytona Sandbox  │
        │          │ (External API)    │   │ (External API)   │
        │          │                   │   │                  │
        │          │ • CVE scraping    │   │ • PoC execution  │
        │          │ • Fallback cache  │   │ • Verify exploit │
        │          └───────────────────┘   └──────────────────┘
        │
        └─────────────────────────────────────────┐
                                                  │
                                    ┌─────────────▼───────────┐
                                    │ Report Output           │
                                    │                         │
                                    ├─ ~/.codeprobe/scans/   │
                                    │   • {id}.json           │
                                    │   • latest.json (link)  │
                                    │   • File perms: 0600    │
                                    │                         │
                                    ├─ Git Changes (--fix)   │
                                    │   • New branch created  │
                                    │   • Patches applied     │
                                    │   • Commits signed      │
                                    │                         │
                                    └─ Terminal Output       │
                                        • Colored text        │
                                        • Progress events     │
                                        • Risk score display  │
                                        • Exit code: 0/1/2    │
```

---

## Data Flow Diagram (End-to-End)

```
START: codeprobe scan ./demo-vulnerable-app
  │
  ├─ index.ts parses arguments
  │  └─ repo_path = "./demo-vulnerable-app"
  │     flags = { fix: false, json: false, verbose: false }
  │
  ├─ config.ts loads API keys
  │  ├─ Check env: BRIGHT_DATA_API_KEY, DAYTONA_API_KEY
  │  └─ Fallback: ~/.codeprobe/config.json (decrypt token)
  │
  ├─ scan.ts calls runFullScan(repo_path, { onEvent })
  │  │
  │  └─ STAGE 1 ENGINE TAKES OVER
  │     │
  │     ├─ parser.ts extracts dependencies
  │     │  └─ emit: { phase: 'parsing', message: 'Found 8 deps' }
  │     │
  │     ├─ scraper.ts fetches CVE data
  │     │  └─ emit: { phase: 'scraping', message: 'Found 3 CVEs' }
  │     │
  │     ├─ matcher.ts matches versions
  │     │  └─ emit: { phase: 'matching', message: '2 matches' }
  │     │
  │     ├─ sandbox.ts spawns Daytona containers
  │     │  └─ emit: { phase: 'sandboxing', message: 'Running PoC' }
  │     │
  │     ├─ sandbox.ts runs exploit
  │     │  └─ exploit succeeds → exploitable: true
  │     │     emit: { phase: 'verification', message: 'CONFIRMED' }
  │     │
  │     ├─ patcher.ts generates patches
  │     │  └─ emit: { phase: 'patching', message: 'Patch ready' }
  │     │
  │     └─ report.ts builds report
  │        └─ emit: { phase: 'report', message: 'Report complete' }
  │
  ├─ progress.ts consumes events
  │  │
  │  ├─ on 'parsing': log "[12:34:56] Parsing dependencies..."
  │  ├─ on 'scraping': log "[12:34:59] Found 3 CVEs"
  │  ├─ on 'verification': log "[12:35:17] ✓ CONFIRMED EXPLOITABLE"
  │  └─ on 'report': log "[12:35:20] Scan complete"
  │
  ├─ errors.ts wraps try/catch
  │  │
  │  ├─ If Bright Data timeout:
  │  │  ├─ Log warning: "❌ Bright Data failed"
  │  │  └─ fallback: use cve-cache.json
  │  │
  │  ├─ If Daytona crash:
  │  │  ├─ Log warning: "⚠️ Sandbox failed"
  │  │  └─ Mark CVE: exploitable = false
  │  │
  │  └─ If network error:
  │     ├─ Log error: "❌ Network error"
  │     └─ Save partial results + exit 2
  │
  ├─ scan.ts formats report
  │  │
  │  ├─ Table output:
  │  │  │  CVE ID         | Severity | Exploitable | Patch
  │  │  │  CVE-2023-44487 | CRITICAL | ✓           | 1.0.1
  │  │  │
  │  ├─ Risk gauge:
  │  │  │  Risk Score: 8.5/10 (HIGH)
  │  │  │
  │  └─ Summary:
  │     │  Confirmed: 1 | Theoretical: 2
  │
  ├─ report.ts saves JSON
  │  │
  │  ├─ File: ~/.codeprobe/scans/UUID.json
  │  │  {
  │  │    "scan": {
  │  │      "id": "scan_abc123",
  │  │      "timestamp": "2026-06-13T12:35:20Z",
  │  │      "cves": [
  │  │        {
  │  │          "id": "CVE-2023-44487",
  │  │          "exploitable": true,
  │  │          "patch_diff": "...",
  │  │          "patch_version": "1.0.1"
  │  │        }
  │  │      ],
  │  │      "risk_score": 8.5
  │  │    }
  │  │  }
  │  │
  │  └─ Symlink: ~/.codeprobe/scans/latest.json → UUID.json
  │     File perms: 0600 (owner read/write only)
  │
  └─ Exit code: 1 (vulnerabilities found)

IF --fix flag:
  │
  ├─ scan-with-fix.ts extracts exploitable CVEs
  │  └─ Found 1 confirmed exploit
  │
  ├─ Git flow:
  │  ├─ Check: git status (fail if dirty)
  │  ├─ Create: git branch codeprobe-fix-20260613-001
  │  ├─ Apply: patch to package.json
  │  ├─ Validate: git apply --check
  │  ├─ Commit: "[CodeProbe] Fix CVE-2023-44487"
  │  └─ Push: git push -u origin codeprobe-fix-20260613-001
  │
  └─ Exit code: 0 (patches applied) or 1 (failed)

END: Return exit code + show next steps
```

---

## Module Dependency Graph

```
Execution Dependency Graph
═════════════════════════════════════════

index.ts
  ├─ commands/scan.ts (no dependency on others)
  ├─ commands/scan-with-fix.ts (depends on scan.ts logic)
  ├─ commands/report.ts (no dependency on others)
  ├─ config.ts (no dependency on others)
  └─ shared/types.ts (import from Stage 1 engine)

scan.ts
  ├─ config.ts (get API keys)
  ├─ progress.ts (log events)
  ├─ errors.ts (catch + handle errors)
  ├─ Stage 1 engine: runFullScan()
  └─ shared/types.ts (Report type)

scan-with-fix.ts
  ├─ scan.ts (run scan first)
  ├─ config.ts (get GitHub token)
  ├─ errors.ts (handle git errors)
  ├─ Stage 1 patcher: patch generation
  └─ Node.js: git commands

progress.ts
  ├─ shared/types.ts (ScanEvent interface)
  └─ chalk (colors), dayjs (timestamps)

errors.ts
  ├─ chalk (colors)
  └─ No other dependencies (reusable utilities)

config.ts
  ├─ fs (file system)
  ├─ path (file paths)
  ├─ crypto (AES-256-GCM encryption, chosen method)
  └─ No other dependencies

report.ts
  ├─ config.ts (not needed if using latest.json)
  ├─ chalk (colors)
  ├─ table-cli (table formatting)
  └─ shared/types.ts (Report type)

shared/types.ts
  └─ Stage 1 engine: import { Scan, CVE, Report, ScanEvent } from '../engine'

shared/utils.ts
  └─ chalk (colors)

shared/constants.ts
  └─ No dependencies
```

---

## File Structure After Implementation

```
codeprobe/
├── src/
│   ├── cli/
│   │   ├── index.ts                 ← Entry point
│   │   ├── commands/
│   │   │   ├── scan.ts              ← Main scan command
│   │   │   ├── scan-with-fix.ts     ← Git integration
│   │   │   └── report.ts            ← Display results
│   │   ├── config.ts                ← Token + API key storage
│   │   ├── progress.ts              ← Event → CLI formatting
│   │   ├── errors.ts                ← Error handling + fallbacks
│   │   └── types.ts                 ← CLI-specific types
│   │
│   ├── engine/                      ← Stage 1 (external)
│   │   ├── index.ts                 (runFullScan export)
│   │   ├── parser.ts
│   │   ├── scraper.ts
│   │   ├── sandbox.ts
│   │   ├── matcher.ts
│   │   ├── patcher.ts
│   │   └── report.ts
│   │
│   ├── shared/
│   │   ├── types.ts                 (Scan, CVE, Report, ScanEvent)
│   │   ├── constants.ts             (timeouts, paths)
│   │   └── utils.ts                 (format score, colorize, etc.)
│   │
│   └── test/
│       ├── cli.test.ts              (mocked engine tests)
│       └── e2e.cli.test.ts          (real engine tests)
│
├── demo-vulnerable-app/             (Stage 1 creates this)
│   ├── package.json
│   └── server.js
│
├── package.json
├── tsconfig.json
├── .env.example
├── demo.sh
├── STAGE_2_IMPLEMENTATION_PLAN.md    (this file's companion)
└── STAGE_2_ARCHITECTURE.md           (this file)

Runtime State:
├── ~/.codeprobe/
│   ├── config.json                  (encrypted tokens)
│   └── scans/
│       ├── scan_abc123.json         (report JSON)
│       ├── scan_def456.json
│       └── latest.json              (symlink to most recent)
```

---

## Event Flow Sequence (Phase by Phase)

```
Timeline of Events During codeprobe scan ./demo-vulnerable-app
═══════════════════════════════════════════════════════════════════

T=0:00   index.ts dispatches 'scan' command
         └─ scan.ts::runFullScan()
            │
T=0:02   EVENT: { phase: 'parsing', status: 'start', message: 'Parsing dependencies...' }
         progress.ts: "[00:00:02] Parsing dependencies..."
         │
T=0:04   EVENT: { phase: 'parsing', status: 'complete', message: 'Found 8 dependencies' }
         progress.ts: "[00:00:04] ✓ Found 8 dependencies"
         │
T=0:05   EVENT: { phase: 'scraping', status: 'start', message: 'Fetching CVE data...' }
         progress.ts: "[00:00:05] Fetching CVE data (Bright Data)..."
         │
         [Bright Data API call — 5s typical]
         │
T=0:20   EVENT: { phase: 'scraping', status: 'complete', message: 'Found 3 CVEs' }
         progress.ts: "[00:00:20] ✓ Found 3 CVEs"
         │
T=0:21   EVENT: { phase: 'matching', status: 'complete', message: '2 matches' }
         progress.ts: "[00:00:21] Matched 2 CVEs"
         │
T=0:22   EVENT: { phase: 'sandboxing', status: 'start', message: 'Spinning up sandbox...' }
         progress.ts: "[00:00:22] Spinning up sandboxes for CRITICAL CVEs..."
         │
         [Daytona provisioning — 15s typical]
         │
T=0:37   EVENT: { phase: 'sandboxing', status: 'complete', message: 'Sandbox ready' }
         progress.ts: "[00:00:37] Sandbox 1: CVE-2023-44487 ready"
         │
T=0:38   EVENT: { phase: 'verification', status: 'start', message: 'Running exploit...' }
         progress.ts: "[00:00:38] Running exploit..."
         │
         [PoC execution — 60s typical]
         │
T=1:38   EVENT: { phase: 'verification', status: 'complete', message: 'CONFIRMED EXPLOITABLE' }
         progress.ts: "[00:01:38] ✓ CONFIRMED EXPLOITABLE (0.8s DoS achieved)"
         │
T=1:39   EVENT: { phase: 'patching', status: 'complete', message: 'Patch ready' }
         progress.ts: "[00:01:39] Patch available: http2-server 1.0.0 → 1.0.1"
         │
T=1:40   EVENT: { phase: 'report', status: 'complete', message: 'Report generated' }
         progress.ts: "[00:01:40] Report complete"
         │
T=1:41   scan.ts displays summary:
         ┌────────────────────────────────┐
         │ SCAN COMPLETE                  │
         │ Risk Score: 8.5/10 (HIGH)     │
         │ Confirmed: 1 | Theoretical: 2 │
         │ Patches: 1 available           │
         └────────────────────────────────┘
         │
T=1:42   report.ts saves to ~/.codeprobe/scans/scan_abc.json
         └─ sets permissions 0600
            updates latest.json symlink
            │
T=1:43   exit code: 1 (vulnerabilities found)
```

---

## Fallback Cascade Diagram

```
Fallback Strategy: What Happens When APIs Fail
═════════════════════════════════════════════════

Scenario 1: Bright Data API timeout (>5s)
─────────────────────────────────────────
  errors.ts catches timeout
    │
    ├─ Log warning: "❌ Bright Data API failed (timeout)"
    ├─ Check for cache file: cve-cache.json exists?
    │  │
    │  ├─ If yes:
    │  │  └─ Load cached CVE data (may be stale)
    │  │     Log: "→ Using cached CVE data (updated 6h ago)"
    │  │
    │  └─ If no:
    │     └─ Fail scan with error
    │        Log: "❌ No cache available. Configure BRIGHT_DATA_API_KEY"
    │
    └─ Scan continues with cached data
       Risk: CVEs may be outdated
       Mitigation: Show "Cache timestamp" in output


Scenario 2: Daytona sandbox crash (provisioning fails)
─────────────────────────────────────────────────────
  sandbox.ts catches error
    │
    ├─ Retry once (total 2 attempts)
    ├─ If retry succeeds:
    │  └─ Continue normally
    │
    └─ If retry fails:
       ├─ Log error: "⚠️ Sandbox verification failed (Daytona unavailable)"
       ├─ Mark CVE: exploitable = false
       ├─ Status: "Verification failed" (shown in output)
       └─ Scan continues with theoretical results only
          Risk: Exploit status unknown
          Mitigation: Clearly mark as "unverified"


Scenario 3: LLM patch generation fails (Nosana timeout)
──────────────────────────────────────────────────────
  patcher.ts catches error
    │
    ├─ Retry once (total 2 attempts)
    ├─ If retry succeeds:
    │  └─ Use generated patch
    │
    └─ If retry fails:
       ├─ Check for pre-baked patch
       ├─ If pre-baked exists:
       │  └─ Use pre-baked patch
       │     Log: "→ Using pre-baked patch for CVE-2023-44487"
       │
       └─ If no pre-baked:
          └─ Show "Patch generation failed"
             Log: "⚠️ Manual patch needed for CVE-2023-44487"


Scenario 4: Network interruption mid-scan
──────────────────────────────────────────
  errors.ts catches network error
    │
    ├─ Determine: where in pipeline did it fail?
    ├─ Save: partial results to ~/.codeprobe/scans/{id}-partial.json
    ├─ Log: "❌ Network interrupted at {phase}"
    ├─ Log: "Partial results saved to {path}"
    └─ Exit code: 2 (scan failed)
       User guidance: "Try again when online. Resume data cached."


Scenario 5: Git dirty repo on --fix
───────────────────────────────────
  scan-with-fix.ts checks git status
    │
    ├─ git status shows uncommitted changes
    ├─ Log warning: "⚠️ Git repository is dirty"
    ├─ Log guidance: "Commit or stash changes first:"
    ├─ Log: "git add . && git commit -m 'WIP'"
    └─ Exit code: 2 (operation failed)
       User action: commit locally, then retry
```

---

## Security Boundaries Diagram

```
Security Model: What's Protected & What's Exposed
════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│  User's Local Machine                                   │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ ~/.codeprobe/ (Owner Read/Write Only, 0700)    │   │
│  │                                                │   │
│  │ ├─ config.json (Encrypted Tokens, 0600)       │   │
│  │ │  └─ BRIGHT_DATA_API_KEY (AES-256-GCM)       │   │
│  │ │     DAYTONA_API_KEY (AES-256-GCM)           │   │
│  │ │     GITHUB_TOKEN (AES-256-GCM)              │   │
│  │ │                                              │   │
│  │ └─ scans/ (Directory, 0700)                   │   │
│  │    ├─ scan_abc123.json (Report, 0600)        │   │
│  │    ├─ scan_def456.json (Report, 0600)        │   │
│  │    └─ latest.json (Symlink)                   │   │
│  │       └─ Contains:                             │   │
│  │          • CVE IDs + severities               │   │
│  │          • Exploitable status                 │   │
│  │          • Patch diffs                        │   │
│  │          • PoC evidence                       │   │
│  │                                                │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  Threat Model:                                         │
│  ✓ Local user (owner): Can read config + reports      │
│  ✓ Owner runs `git push`: GitHub token retrieved      │
│  ✗ Other user on machine: Cannot read config/reports  │
│  ✗ SSH session: Cannot access ~/.codeprobe without    │
│     escalation                                        │
│  ✗ Malware/injection: Would need user-level access   │
│     (out of scope for MVP)                           │
│                                                         │
└─────────────────────────────────────────────────────────┘

Network Boundaries:
═══════════════════

CLI ←→ Bright Data (encrypted HTTPS)
 └─ Sends: dependency names + versions
    Returns: CVE metadata (public info)

CLI ←→ Daytona (authenticated API key)
 └─ Sends: PoC exploit script
    Returns: sandbox stdout/stderr
    Note: Code execution in isolated container

CLI ←→ Nosana/Claude (authenticated API key, optional)
 └─ Sends: CVE details + code
    Returns: patch diffs
    Encryption: TLS only (no end-to-end crypto)
    Note: User code sent to third-party if LLM needed

GitHub ←→ CLI (git + HTTPS with token)
 └─ Sends: branch + commits via authenticated push
    Uses: GitHub token from config.json
    Security: Token must be kept secret

User (Manual) ←→ Git Repo (ssh/https)
 └─ Reviews: auto-generated branch + patch
    Accepts: pulls to main (user decision)
    Safety: Pull request review gate recommended
```

---

## Test Coverage Map

```
Test Layers & Coverage
════════════════════════════════════════════════════════════════════

Layer 1: Unit Tests (Mocked Engine)
───────────────────────────────────────
File: src/test/cli.test.ts
Run: bun test src/test/cli.test.ts
Environment: Offline, mocked engine, no API calls
Runnable Now: ✓ Yes (before Stage 1 ready)

Tests:
  ✓ CLI entry point parses args
  ✓ Config loads/saves correctly
  ✓ Config encryption roundtrip
  ✓ Error handling: Bright Data timeout
  ✓ Error handling: Daytona crash
  ✓ Error handling: Network error
  ✓ Progress formatting (colors, timestamps)
  ✓ Scan command exit codes (0, 1, 2)
  ✓ --json flag outputs valid JSON
  ✓ --fix flag creates git branch
  ✓ --fix flag applies patch
  ✓ Report formatting (table)
  ✓ Fallback logic: cache used on timeout
  ✓ Fallback logic: patch applied despite sandbox fail
  ✓ Permission checks: 0600 on report files

Coverage: ~85% (mocked dependencies)


Layer 2: Integration Tests (Real Engine, Same Machine)
──────────────────────────────────────────────────────────
File: src/test/e2e.cli.test.ts
Run: bun test src/test/e2e.cli.test.ts
Environment: Real Stage 1 engine, demo repo, real Bright Data
Runnable After: Stage 1 ready (Hour 3)

Tests:
  ✓ Full scan pipeline: parse → scrape → verify → report
  ✓ Report saved to correct path (~/.codeprobe/scans/{id}.json)
  ✓ Exit code 1 when CVEs found
  ✓ Exit code 0 when no CVEs
  ✓ Output contains "CONFIRMED EXPLOITABLE" for demo CVE
  ✓ latest.json symlink updated
  ✓ --fix creates real git branch
  ✓ --fix commits patches
  ✓ Timing: scan completes in <3 minutes
  ✓ Timing breakdown per phase

Coverage: ~95% (real endpoints)


Layer 3: Manual/Demo Tests
──────────────────────────────
File: demo.sh
Run: bash demo.sh && time bash demo.sh
Environment: Real system, real repo, real APIs
Runnable After: Stage 2 + Stage 1 complete (Hour 3.5)

Scenarios:
  ✓ Full demo from scratch (clean cache)
  ✓ Timing <3 minutes
  ✓ Git branch created + visible
  ✓ Report readable by human
  ✓ Fallback video recorded (Bright Data timeout)

Coverage: ~100% (complete flow)
```

---

## Deployment / Runtime Checklist

```
Before Hackathon Demo:
════════════════════════════════════════════════════════════════════

Pre-Flight (30 minutes before demo):
─────────────────────────────────────
□ Start fresh: rm -rf ~/.codeprobe/scans/*
□ Run dry-run scan: bun run src/cli/index.ts scan ./demo-vulnerable-app
  └─ Verify: "CONFIRMED EXPLOITABLE" appears
  └─ Verify: Risk score displays
  └─ Verify: Timing <3 min
□ Verify git: git branch (no codeprobe-fix branches)
□ Start API server: bun run src/api/server.ts (if dashboard included)
□ Test OAuth: Can you log in?
□ Check network: ping to Bright Data / Daytona working
□ Backup: Have fallback video ready (demo-fallback-video.mp4)
□ Power: Plug in laptop, have cable ready

During Demo (Judges Watching):
───────────────────────────────
1. CLI Demo (0–1 min):
   $ codeprobe scan ./demo-vulnerable-app
   └─ Show real-time progress
   └─ Highlight "CONFIRMED EXPLOITABLE"
   
2. Dashboard Demo (1–1.5 min):
   $ open http://localhost:3000
   └─ Login with GitHub OAuth
   └─ Show scan results
   └─ Highlight risk score + business impact
   
3. Patch Application (1.5–2 min):
   $ codeprobe scan ./demo-vulnerable-app --fix
   $ git branch | grep codeprobe-fix
   └─ Show auto-created branch
   └─ Explain: judges could merge PR to fix

If Live Demo Fails (After 30s of issues):
──────────────────────────────────────────
▶ Switch to fallback video
▶ Walk judges through code
▶ Show GitHub bot PR commenting (if built)
▶ Explain: "Architecture is sound, API latency unexpected today"
```

---

## Summary

**Stage 2 is the bridge between:**
- **Input**: Stage 1 engine exports + user CLI args
- **Processing**: Event streams, error handling, fallbacks
- **Output**: Terminal UI + JSON reports + git branches

**Key Design Decisions:**
1. **Event-driven** (not polling) — Stage 1 emits, Stage 2 listens
2. **Graceful fallbacks** — Demo works even if APIs fail
3. **Local-first** — Reports saved to `~/.codeprobe/`, no database needed
4. **Git-native** — Uses git commands directly, no wrapper library
5. **Security-conscious** — Encrypted token storage, file permissions, no silent failures

**Critical Dependencies:**
- Stage 1 contract (interface specification locked)
- Token encryption decision (blocks config.ts)
- Demo vulnerable app (provided by Stage 1)
- Pre-baked patches (provided by Stage 1)

**Success Metrics:**
- `bun test` passes (all tests)
- `demo.sh` completes <3 minutes
- `codeprobe scan --fix` creates real git branch
- Output is colorized, timestamped, readable
- Fallbacks work (cache on Bright Data fail, continue on Daytona fail)
