# CodeProbe MVP — Stage 2: CLI + Verification + Fallbacks
**Duration:** 2–4 hours  
**Team:** 1–2 engineers (can work in parallel with Stage 1 or sequentially)  
**Dependency:** Stage 1 must be working  

---

## Overview

Build the **CLI interface** and **production-grade fallback logic**. This is where the "demo moment" happens: user runs `codeprobe scan` and sees real-time exploit verification. Includes error handling, retry logic, and graceful degradation if external APIs fail.

**Success Metric:** `codeprobe scan ./demo-vulnerable-app` completes in <3 minutes, shows risk score + confirmed exploitable CVEs, patches are ready to apply.

---

## Critical Decisions (Locked)

| What | Decision | Why |
|------|----------|-----|
| CLI Framework | No heavy framework; use chalk + table.js | Keep it simple, fast startup. No `commander.js` overhead. |
| Real-Time Output | Event emitter (progress updates) → CLI polls/logs | Engine emits: "parsing...", "scraping...", "sandboxing...", CLI logs with timestamps. |
| Fallback Strategy | Bright Data fails → cached CVE JSON. Daytona crash → mark "verification failed". LLM fails → use pre-baked patch. | Demo must work even if 1–2 APIs are flaky. Pre-record fallback video anyway. |
| Config Storage | `~/.codeprobe/config.json` (GitHub token encrypted with SHA256 + salt) | Simple, portable. No database. |
| Exit Codes | 0 = success, 1 = vulnerabilities found, 2 = scan failed | Matches CI/CD standards. |

---

## Deliverables

### 1. CLI Entry Point
- [ ] `src/cli/index.ts`:
  - Commands: `scan`, `scan --fix`, `report`
  - No args = show help
  - `--json` flag for machine-readable output
  - `--verbose` flag for detailed logs
  - Error handling: catch all errors, show friendly messages + suggestion
  - **Test**: `bun ./src/cli/index.ts --help` shows usage

### 2. `codeprobe scan` Command
- [ ] `src/cli/commands/scan.ts`:
  - Input: repo URL or local path (default: current dir)
  - Output: Real-time progress to stdout
  - Flow:
    ```
    ⚡ CodeProbe v1.0.0
    [12:34:56] Parsing dependencies...
    [12:34:58] Found 8 dependencies
    [12:34:59] Fetching CVE data (Bright Data)...
    [12:35:14] Found 3 CVEs matching your dependencies
    [12:35:15] Spinning up sandboxes for CRITICAL CVEs...
    [12:35:16]   ├─ Sandbox 1: CVE-2023-44487 (HTTP/2 Rapid Reset)
    [12:35:17] Running exploit...
    [12:36:17] ✓ CONFIRMED EXPLOITABLE (DoS achieved in 0.8s)
    
    ────────────────────────────────────────────────
    SCAN COMPLETE
    Risk Score: 8.5/10 (HIGH)
    Confirmed Exploitable: 1
    Theoretical Risk: 2
    
    Patches Available: 1
    View full report: ~/.codeprobe/scans/{scan_id}.json
    ────────────────────────────────────────────────
    ```
  - Colors: Green = confirmed, Yellow = theoretical, Red = supply chain warnings
  - Exit code: 0 (no vulns), 1 (vulns found), 2 (scan failed)

### 3. `codeprobe scan --fix` Command
- [ ] `src/cli/commands/scan-with-fix.ts`:
  - After scan completes, generate patches for confirmed CVEs
  - Create new git branch: `codeprobe-fix-{timestamp}`
  - Apply patches (update package.json + package-lock.json)
  - Commit with message:
    ```
    [CodeProbe] Fix CVE-2023-44487 (HTTP/2 Rapid Reset)
    
    Exploit verification: CONFIRMED EXPLOITABLE
    Risk Score: 8.5/10
    Patch: http2-server 1.0.0 → 1.0.1
    ```
  - Output:
    ```
    [12:36:20] Applying patches...
    [12:36:25] ✓ Updated http2-server: 1.0.0 → 1.0.1
    [12:36:26] Committed to branch: codeprobe-fix-2026-06-13-001
    [12:36:27] Push to GitHub: git push -u origin codeprobe-fix-2026-06-13-001
    ```
  - Exit code: 0 (patches applied), 1 (patches failed), 2 (scan failed)

### 4. `codeprobe report` Command
- [ ] `src/cli/commands/report.ts`:
  - Display last scan results (from `~/.codeprobe/scans/latest.json`)
  - Formatted table: CVE | Package | Severity | Exploitable | Patch Version
  - Option: `--export json` or `--export html`
  - Exit code: 0

### 5. Config Management
- [ ] `src/cli/config.ts`:
  - Load/save `~/.codeprobe/config.json`
  - Store: GitHub token (encrypted), Bright Data API key, Daytona API key, Nosana API key
  - Encryption: SHA256 + salt (simple, not production-grade, but OK for MVP)
  - Methods: `getConfig()`, `setConfig(key, value)`, `clearConfig(key)`
  - On first run: prompt for GitHub token (if needed for later features)

### 6. Progress + Logging
- [ ] `src/cli/progress.ts`:
  - Event emitter from Stage 1 engine
  - Translate engine events → human-readable CLI output
  - Progress bar library: use simple ASCII (no fancy libraries)
  - Colors: chalk.js
  - Timestamps: dayjs.js
  - Levels: `info`, `warn`, `error`, `success`
  - **Test**: `bun run index.ts scan . --verbose` should show all events

### 7. Error Handling + Fallbacks
- [ ] `src/cli/errors.ts`:
  - Catch all exceptions at top level
  - Map to user-friendly messages:
    ```
    ❌ Bright Data API failed (network timeout)
    → Using cached CVE data (last updated 2h ago)
    → Scan continues but results may be incomplete
    ⚠️ Run `codeprobe config set BRIGHT_DATA_API_KEY <key>` to use live data
    ```
  - Fallback triggers:
    - Bright Data timeout (5s) → use cache
    - Daytona spawn fail (2 retries) → mark "verification failed", continue
    - LLM generation fail (2 retries) → use pre-baked patch
  - Never silently fail; always log what went wrong + what we're doing instead

### 8. Integration Tests
- [ ] `src/test/cli.test.ts`:
  ```ts
  test("CLI: scan demo repo end-to-end", async () => {
    const { exitCode, output } = await runCLI(["scan", "./demo-vulnerable-app"]);
    expect(exitCode).toBe(1); // 1 = vulnerabilities found
    expect(output).toContain("CVE-2023-44487");
    expect(output).toContain("CONFIRMED EXPLOITABLE");
    expect(output).toContain("Risk Score");
  });

  test("CLI: --fix creates branch and commits", async () => {
    const { exitCode, output } = await runCLI(["scan", "./demo-vulnerable-app", "--fix"]);
    expect(exitCode).toBe(1);
    expect(output).toContain("codeprobe-fix");
    // Check git branch was created
    const branches = await $`git branch`.text();
    expect(branches).toContain("codeprobe-fix");
  });
  ```
- [ ] Run: `bun test` → should pass

### 9. Performance Optimization
- [ ] Measure + log scan time:
  ```
  ⏱️  Scan completed in 2m 34s
  - Parsing: 2s
  - Scraping: 18s
  - Sandbox setup: 45s
  - Exploit execution: 28s
  - Patch generation: 1s
  ```
- [ ] If any step > 30s, log warning: "⚠️ Step XYZ slow (YYs). Consider checking your network."
- [ ] Target: <3 minutes end-to-end

### 10. Demo Rehearsal Script
- [ ] `demo.sh`:
  ```bash
  #!/bin/bash
  set -e
  echo "=== CodeProbe Demo Script ==="
  echo "1. Clear previous scans..."
  rm -rf ~/.codeprobe/scans/*
  
  echo "2. Run full scan with --fix..."
  bun run src/cli/index.ts scan ./demo-vulnerable-app --fix
  
  echo "3. Show results..."
  bun run src/cli/index.ts report --export json | jq .
  
  echo "4. Verify git branch created..."
  git branch
  
  echo "✅ Demo successful"
  ```
- [ ] Run manually: `bash demo.sh` should complete without errors
- [ ] Time it: `time bash demo.sh` (target <3 minutes)

---

## Acceptance Criteria

✅ **Must Have:**
1. `bun run src/cli/index.ts scan ./demo-vulnerable-app` completes in <3 minutes
2. Shows "CONFIRMED EXPLOITABLE" for HTTP/2 CVE
3. Shows risk_score (0–10)
4. JSON report saved to `~/.codeprobe/scans/{id}.json`
5. `--fix` flag creates git branch + commits patches
6. `--json` flag outputs valid JSON
7. Exit code: 1 when vulnerabilities found
8. If Bright Data fails, uses cache + shows warning
9. `bun test` passes (all CLI tests)
10. `demo.sh` runs without errors

✅ **Nice to Have:**
- Colorized output (green/yellow/red)
- Progress bar ASCII animation
- Scan time breakdown per stage
- `--verbose` flag shows detailed logs

---

## Known Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| CLI startup is slow (Bun cold start) | Pre-warm Bun by running once before demo. Measure startup time. |
| Bright Data scraping times out | Pre-cache CVE data. In demo, show fallback working. |
| Daytona sandbox slow to provision | Pre-test sandbox startup latency. If >30s, adjust timeout expectations. |
| User's git repo is dirty | Check `git status` before `--fix`. If dirty, warn + ask to commit first. |
| Network connectivity lost mid-scan | Graceful error: "Scan interrupted. Results saved to {cache}. Try again when online." |

---

## Setup Checklist

Before starting Stage 2:
- [ ] Stage 1 passing (`bun test` in `src/test/engine.test.ts`)
- [ ] Demo repo has HTTP/2 vulnerable server running locally (test: `curl http://localhost:8080`)
- [ ] Bright Data cache file exists: `cve-cache.json` (even if API fails)
- [ ] Pre-baked patches exist: `patches.json`
- [ ] Git repo initialized locally: `git init` (for --fix flag testing)
- [ ] API keys set as env vars (or in `~/.codeprobe/config.json`)

---

## Deliverable Checklist

When Stage 2 is done:
- [ ] Push to branch: `stage-2-cli` (or merge into `stage-1-engine` if both complete)
- [ ] Run demo manually: `bash demo.sh` (timing should be <3 minutes)
- [ ] Create summary: "Stage 2 Complete: CLI fully functional, real-time progress logging, fallbacks tested"
- [ ] Note any deviations: If Bright Data timeout happens, document actual fallback behavior
- [ ] List blockers for Stage 3: "Dashboard needs {scan_id} lookup, requires database or S3 key"

---

## Files to Create/Modify

```
NEW:
  src/cli/index.ts
  src/cli/commands/scan.ts
  src/cli/commands/scan-with-fix.ts
  src/cli/commands/report.ts
  src/cli/config.ts
  src/cli/progress.ts
  src/cli/errors.ts
  src/test/cli.test.ts
  demo.sh

MODIFY:
  package.json (add CLI entry point: bin.codeprobe)
  src/engine/report.ts (add latest.json symlink)
```

---

**Next Stage:** Once this is complete, Stage 3 begins (Dashboard + Auth + Polish).
