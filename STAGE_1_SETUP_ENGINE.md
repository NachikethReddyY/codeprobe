# CodeProbe MVP — Stage 1: Setup + Core Engine
**Duration:** 0–2 hours  
**Team:** 1–2 engineers  
**Blocker:** Must complete before Stage 2 starts  

---

## Overview

Build the foundational engine: dependency parser, CVE scraper, sandbox integration, and report schema. This stage focuses on **data plumbing** — getting info in, processing it, outputting structured results. No CLI yet, no UI.

**Success Metric:** Core engine executes end-to-end with real Bright Data + Daytona sandbox on a demo HTTP/2 vulnerable repo. Produces valid JSON report.

---

## Critical Decisions (Locked)

| What | Decision | Why |
|------|----------|-----|
| Demo CVE | ejs CVE-2022-29078 (Template Injection RCE) | Real npm package with vulnerable (3.1.0–3.1.6) and fixed (3.1.7+) versions. Local PoC, no outbound network. RCE is most dramatic for judges. |
| Patch Strategy | Pre-bake patches into codebase | Zero risk on demo. LLM generation (Nosana/Claude) is validation harness only, not demo-critical. |
| Fallbacks | Bright Data fails → use cached CVE JSON. Daytona crashes → retry once, mark as "verification failed". | Demo must work even if external APIs are slow/flaky. Pre-record fallback video. |
| API Keys | Env vars: `BRIGHT_DATA_API_KEY`, `DAYTONA_API_KEY`, `NOSANA_API_KEY` | Secure by default. Read from environment at startup. |

---

## Deliverables

### 1. Project Setup
- [ ] Bun project structure:
  ```
  src/
    ├── shared/
    │   ├── types.ts         (Scan, CVE, Report schemas)
    │   └── constants.ts     (API endpoints, timeouts)
    ├── engine/
    │   ├── parser.ts        (extract deps from package.json)
    │   ├── scraper.ts       (Bright Data CVE fetch)
    │   ├── sandbox.ts       (Daytona spawn + PoC execution)
    │   ├── matcher.ts       (semver: deps → CVEs)
    │   ├── patcher.ts       (pre-baked patches + LLM fallback)
    │   └── report.ts        (JSON report builder)
    └── test/
        └── engine.test.ts   (validation tests)
  ```
- [ ] `package.json`: Add deps (zod, axios, chalk, dayjs)
- [ ] `tsconfig.json`: Strict mode
- [ ] `.env.example`: Template for API keys
- [ ] `bun.lockb`: Dependencies locked

### 2. Shared Types + Schema
- [ ] `src/shared/types.ts`:
  ```ts
  type Scan = {
    id: string;
    timestamp: string;
    repo_url: string;
    cves: CVE[];
    risk_score: number;
    patches_available: number;
  };

  type CVE = {
    id: string;
    package: string;
    version_vulnerable: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    cvss: number;
    exploitable: boolean;
    exploit_evidence: string; // stdout from sandbox
    patch_diff?: string;
    patch_version?: string;
  };

  type Report = {
    scan: Scan;
    summary: { exploitable_count: number; theoretical_count: number };
  };
  ```
- [ ] Validate with Zod at runtime (parser input, scraper output, sandbox results)

### 3. Dependency Parser
- [ ] `src/engine/parser.ts`:
  - Input: local path or GitHub repo URL
  - Parse `package.json` + `package-lock.json`
  - Extract: `{ name, version }[]`
  - Handle errors (missing files, malformed JSON)
  - Cache parsed results (30s TTL)
  - **Test on demo repo**: Should extract HTTP/2 vulnerable dependency

### 4. Bright Data CVE Scraper
- [ ] `src/engine/scraper.ts`:
  - Input: `{ name, version }[]` from parser
  - Fetch CVE data from Bright Data API (or fallback to `cve-cache.json`)
  - Return: `CVE[]` with severity, CVSS, PoC links
  - Implement exponential backoff (3 retries, 30s timeout)
  - Log warnings if using cached data
  - **Test**: Should fetch data for HTTP/2 vulnerability without rate-limiting

### 5. Daytona Sandbox Integration
- [ ] `src/engine/sandbox.ts`:
  - Spawn isolated Daytona container (Node.js 20, 512MB RAM, 60s timeout)
  - Install vulnerable package version
  - Inject PoC exploit script (pre-baked HTTP/2 exploit)
  - Capture stdout + stderr + exit code
  - Determine: `exploitable: boolean` (exit code 0 + expected output = success)
  - Retry once on crash
  - **Test**: Should spawn sandbox, run HTTP/2 PoC, confirm "exploitable: true"

### 6. CVE Matcher
- [ ] `src/engine/matcher.ts`:
  - Input: parsed deps + scraped CVEs
  - Semver matching: `dep.version` vs `cve.affected_versions`
  - Return: matched CVEs only
  - **Test**: Should match HTTP/2 vulnerability to parsed dependency

### 7. Pre-Baked Patch System
- [ ] `src/engine/patcher.ts`:
  - Load pre-baked patch JSON:
    ```json
    {
      "CVE-2023-44487": {
        "package": "http2-server",
        "from_version": "1.0.0",
        "to_version": "1.0.1",
        "diff": "... unified diff ..."
      }
    }
    ```
  - On LLM fallback: validate patch compiles + re-run PoC against patched code
  - If LLM patch fails validation, use pre-baked
  - **Test**: Should load + return correct patch for demo CVE

### 8. Report Builder
- [ ] `src/engine/report.ts`:
  - Input: Scan + CVEs + patches
  - Output: JSON adhering to `Report` type
  - Calculate risk_score: `(exploitable_count * 10 + theoretical_count * 3) / total_cves`
  - Capped 0–10
  - Save to `~/.codeprobe/scans/{scan_id}.json`
  - **Test**: Should produce valid JSON matching schema

### 9. Demo Repository Setup
- [ ] Create `demo-vulnerable-app/` (separate repo or subdirectory):
  ```
  package.json: { "ejs": "3.1.6" }
  server.js: Express app using ejs templates (vulnerable to RCE via template injection)
  .gitignore: Add codeprobe scan results
  ```
- [ ] Verify parser + scraper + sandbox work end-to-end on this repo
- [ ] Document how to run locally: `cd demo-vulnerable-app && bun ../index.ts scan .`

### 10. End-to-End Test (Stage 1 Validation)
- [ ] `src/test/engine.test.ts`:
  ```ts
  test("Full pipeline: parse → scrape → match → sandbox → report", async () => {
    const report = await runFullScan("./demo-vulnerable-app");
    expect(report.scan.cves).toHaveLength(1);
    expect(report.scan.cves[0].id).toBe("CVE-2022-29078");
    expect(report.scan.cves[0].exploitable).toBe(true);
    expect(report.scan.risk_score).toBeGreaterThan(8);
  });
  ```
- [ ] Run: `bun test` → should pass

---

## Acceptance Criteria

✅ **Must Have:**
1. Bun project compiles with `bun build` (no errors)
2. `bun test` passes (engine E2E test succeeds)
3. JSON report generated at `~/.codeprobe/scans/{id}.json` with correct schema
4. Bright Data fallback works (if API key invalid, uses cached CVE data)
5. Daytona sandbox returns `exploitable: true` for demo CVE
6. Patch diff present in report for demo CVE

✅ **Nice to Have:**
- Pre-record demo of Stage 1 working (for fallback if Stage 2/3 break)
- Logs are colorized + timestamped (chalk.js)

---

## Known Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Bright Data API key invalid | Pre-test with your actual key. If fails, use `cve-cache.json` fallback. |
| Daytona sandbox provisioning slow | Timeout set to 60s. If slower, Stage 2/3 will see latency. Pre-test sandbox startup time. |
| ejs RCE PoC doesn't work in Daytona | Pre-test PoC script locally (template injection is simple, should work). If it fails, use pre-baked evidence (capture stdout locally, replay in sandbox). |
| Package-lock.json missing in demo repo | Fallback to package.json only (less accurate, but works). |
| Zod validation too strict | Adjust schema if external APIs return unexpected fields. Log + continue. |

---

## Setup Checklist

Before starting work:
- [ ] Bun 1.0+ installed locally
- [ ] Bright Data API key provisioned (test curl request works)
- [ ] Daytona API key provisioned (test sandbox spawn works)
- [ ] Nosana API key or Claude API key ready (for LLM fallback in Stage 2)
- [ ] Demo repo created with HTTP/2 vulnerable server
- [ ] GitHub OAuth app registered (not needed until Stage 3, but good to prep)
- [ ] VS Code with Bun extension (optional, for debugging)

---

## Deliverable Checklist

When Stage 1 is done:
- [ ] Push to branch: `stage-1-engine`
- [ ] Create summary: "Stage 1 Complete: Core engine working, HTTP/2 PoC verified, risk_score calculates correctly"
- [ ] Note any deviations from plan (if Log4Shell was tried and failed, document why)
- [ ] List any blockers for Stage 2 (e.g., "Daytona sandbox startup takes 15s per CVE, affects timeline")

---

## Files to Create/Modify

```
NEW:
  src/shared/types.ts
  src/shared/constants.ts
  src/engine/parser.ts
  src/engine/scraper.ts
  src/engine/sandbox.ts
  src/engine/matcher.ts
  src/engine/patcher.ts
  src/engine/report.ts
  src/test/engine.test.ts
  demo-vulnerable-app/package.json
  demo-vulnerable-app/server.js
  cve-cache.json (fallback CVE data)
  patches.json (pre-baked patches)
  .env.example

MODIFY:
  package.json (add deps)
  tsconfig.json (strict mode)
```

---

**Next Stage:** Once this is complete, Stage 2 begins (CLI + orchestration + fallbacks).
