# CodeProbe Stage 2: Detailed Implementation Plan  
**CLI + Verification + Fallbacks**

**Status**: Ready for execution (pending token encryption decision)  
**Duration**: 2–4 hours (with Stage 1 contract locked)  
**Dependencies**: Stage 1 engine interface finalized

---

## Executive Summary

Stage 2 (CLI + Verification) is a **2-4 hour deliverable IF Stage 1 is complete**. The critical blocker is not the CLI code itself but Stage 1's core engine exports. This plan:

1. Front-loads the **interface contract** that Stage 2 codes against
2. Enables **parallel work** with mocked engines (CLI surface buildable before Stage 1 finishes)
3. Flags the **encryption decision** (SHA256 is broken — needs real choice)
4. Addresses all **ORCHESTRATOR risks** inline with concrete mitigations
5. Provides **hour-by-hour breakdown** with file names + test strategy

**Timeline Assessment**: 2-3h CLI surface + 30m Stage 1 integration = 3-4h total Stage 2 (honest estimate, vs 2-4h in original spec)

---

## Part 1: Stage 1 Dependency Contract

### 1.1 Interface Specification (Stage 2 Codes Against This)

**File: `/src/engine/index.ts`** — Stage 1 must export:

```typescript
// Event emitter: Core integration seam for Stage 2 progress.ts
export interface ScanEvent {
  phase: 
    | 'parsing'
    | 'scraping'
    | 'matching'
    | 'sandboxing'
    | 'verification'
    | 'patching'
    | 'report';
  status: 'start' | 'progress' | 'complete' | 'error';
  message: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  metadata?: Record<string, unknown>;
}

// Core types (from src/shared/types.ts)
export type Scan = {
  id: string;
  timestamp: string;
  repo_url: string;
  cves: CVE[];
  risk_score: number; // 0-10
  patches_available: number;
};

export type CVE = {
  id: string;
  package: string;
  version_vulnerable: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvss: number; // 0.0-10.0
  exploitable: boolean; // Key: Stage 2 reads this
  exploit_evidence: string; // sandbox stdout
  patch_diff?: string;
  patch_version?: string;
};

export type Report = {
  scan: Scan;
  summary: { 
    exploitable_count: number;
    theoretical_count: number;
  };
};

// Main entry point Stage 2 calls
export async function runFullScan(
  repoPath: string,
  options?: {
    verbose?: boolean;
    onEvent?: (event: ScanEvent) => void;
  }
): Promise<Report>;
```

**Stage 1 Delivery Checklist:**
- ✓ `runFullScan()` returns valid `Report` matching type schema
- ✓ Event emitter fires events with correct `ScanEvent` shape
- ✓ CVE.exploitable boolean correctly reflects sandbox success/failure
- ✓ Report saved to `~/.codeprobe/scans/{id}.json`
- ✓ `latest.json` symlink updated by engine

---

### 1.2 Critical Gate: Token Storage (DECISION REQUIRED)

**PROBLEM**: STAGE_2_CLI_VERIFICATION.md lines 99-102 claim "Encryption: SHA256 + salt"

SHA256 is **one-way hash** — you cannot recover a GitHub token from `SHA256(token + salt)`. Token must be retrievable for `git push` in `--fix`.

**Options (Choose One):**

| Option | Security | Complexity | Cross-Platform |
|--------|----------|-----------|-----------------|
| **A: OS Keychain** | Best | Medium | No (macOS/Linux only) |
| **B: AES-256-GCM** | Good | Medium | Yes |
| **C: Plaintext + 0600** | Poor | Low | Yes |

**Recommended (MVP)**: **Option B (AES-256-GCM with machine ID)**
- Works cross-platform (no system setup required)
- Reasonable security for MVP
- Fallback to plaintext at runtime if key derivation fails

**User Decision Needed:** Confirm choice before implementing `config.ts`

---

## Part 2: Hourly Breakdown

### Stage 2 Can Start Immediately (No Stage 1 Dependency)

These tasks are buildable right now with mocked engine:

- ✓ `config.ts` — local filesystem only
- ✓ `progress.ts` — mock events
- ✓ `errors.ts` — generic error handling
- ✓ Unit tests with mocked engine
- ✓ CLI entry point skeleton

### Stage 2 Blocked Until Stage 1 Delivers

- ✗ `scan.ts` full implementation (needs `runFullScan()`)
- ✗ `scan-with-fix.ts` (needs Stage 1 patcher + sandbox)
- ✗ E2E test (`demo.sh` with real exploit)
- ✗ Acceptance criteria validation

---

### Hour-by-Hour Breakdown

#### **HOUR 0: Setup & Contract Lock (30 min)**

**Deliverables:**
- Confirm Stage 1 contract matches spec above
- **Lock encryption decision** (A, B, or C)
- Scaffold project structure

**Files:**
- `/src/cli/index.ts` (empty stub)
- `/src/cli/config.ts` (empty stub)
- `/src/cli/commands/scan.ts` (empty stub)
- `/src/cli/progress.ts` (empty stub)
- `/src/cli/errors.ts` (empty stub)
- `/src/test/cli.test.ts` (empty stub)
- `package.json`: add deps (chalk, table-cli, dayjs, zod, axios)

**Parallel Start**: Stage 1 team begins parser + scraper

---

#### **HOUR 1: CLI Bootstrap + Config (60 min)**

**Deliverables:**

1. **`config.ts`** (20 min)
   - Load/save `~/.codeprobe/config.json`
   - Encrypt GitHub token (using chosen method from Hour 0 decision)
   - Methods: `getConfig()`, `setConfig()`, `clearConfig()`
   - Env var fallback: `BRIGHT_DATA_API_KEY` precedence over config file

2. **`index.ts`** (15 min)
   - Entry point: dispatch commands (scan, report, help)
   - Exit codes: 0=success, 1=vulns, 2=failed
   - Usage text for no args

3. **`scan.ts` skeleton** (15 min)
   - Parse CLI args (repo path, defaults to `.`)
   - Stub that shows placeholder output
   - Test: `bun run src/cli/index.ts scan .` exits 0

4. **`progress.ts` + `errors.ts` stubs** (10 min)
   - Mock event handler
   - Generic error categorization

---

#### **HOUR 2: Real-Time Output + Error Handling (60 min)**

**Deliverables:**

1. **`progress.ts`** (20 min)
   - Consume Stage 1 events
   - Format → CLI output (colors, timestamps)
   - Example: "[12:34:56] ✓ Found 3 CVEs"

2. **`errors.ts`** (20 min)
   - Catch errors, map to friendly messages
   - Fallback triggers: Bright Data timeout → cache, Daytona crash → continue
   - All errors logged + user guidance shown

3. **`scan.ts` (full)** (15 min)
   - Implement: parse → runFullScan → format → save → exit
   - Handle `--json` and `--verbose` flags
   - Test with mocked engine

4. **Unit tests with mocked engine** (5 min)
   - `test("scan exits 1 on vulns found")`
   - `test("--json outputs valid JSON")`
   - Run: `bun test src/test/cli.test.ts`

**Can run in parallel**: Stage 1 on sandbox + reporting

---

#### **HOUR 3: Fallbacks + Git Integration (90 min)**

**Deliverables:**

1. **`scan-with-fix.ts`** (40 min)
   - Scan first → extract exploitable CVEs
   - Git flow: check status, create branch, commit patches
   - Error handling: dirty repo, patch apply fails
   - Test with mocked engine + mocked git

2. **Integration tests** (30 min)
   - `test("--fix creates git branch")`
   - `test("fallback: Bright Data fails → cache used")`
   - `test("error: dirty repo → abort")`
   - Run: `bun test src/test/cli.test.ts` (all 9+ tests)

3. **`report.ts`** (15 min — can defer to Hour 3.5)
   - Read `~/.codeprobe/scans/latest.json`
   - Format as table
   - Test formatting

4. **Edge cases + polishing** (5 min)
   - Config edge cases
   - Permission checks
   - Error message quality

---

#### **HOUR 3.5–4: E2E Test + Demo Rehearsal (60 min, AFTER Stage 1)**

**Deliverables:**

1. **E2E Integration Test** (20 min)
   - File: `/src/test/e2e.cli.test.ts`
   - Test: `bun run src/cli/index.ts scan ./demo-vulnerable-app`
   - Assertions:
     - Exit code = 1 (vulns found)
     - Output contains "CVE-2023-44487"
     - Output contains "CONFIRMED EXPLOITABLE"
     - `~/.codeprobe/scans/latest.json` exists
   - Run: `bun test src/test/e2e.cli.test.ts`
   - **BLOCKER**: Requires Stage 1 working

2. **Demo Script** (15 min)
   - File: `/demo.sh`
   - Clear cache, run scan, show report, verify branch
   - Time it: `time bash demo.sh` (target <3 min)

3. **Rehearsal** (25 min)
   - Run demo 3-5 times
   - Measure actual timing per phase
   - Record fallback video (e.g., Bright Data timeout)

---

## Part 3: Parallel Work Diagram

```
Hour 0: Setup
  ├─ Stage 1: Parser + Scraper (1-2h)
  └─ Stage 2: Config + CLI skeleton (immediate)

Hour 1: CLI Bootstrap
  ├─ Stage 1: Sandbox integration (45m)
  └─ Stage 2: Config + progress + errors (60m, parallel)

Hour 2: Integration
  ├─ Stage 1: Report builder (30m)
  └─ Stage 2: Full scan command + unit tests (60m)

Hour 3: Fallbacks + Git
  ├─ Stage 1: Patcher + final polish (30m, done)
  └─ Stage 2: --fix command + integration tests (90m)

Hour 3.5+: E2E + Demo (after both complete)
  ├─ Stage 2 E2E test (20m, requires Stage 1 ready)
  └─ Demo rehearsal (45m)

Total: 3.5–4h wall time (if parallelized)
Critical Path: Stage 1 engine (blocks E2E)
```

---

## Part 4: Addressing ORCHESTRATOR Risks

### 4.1 Timeline Risk: "5h vs 12-24h needed"

**Assessment:**
- **Stage 2 alone**: 2-3h (CLI + tests)
- **Stage 1 alone**: 2-4h (engine)
- **Combined (parallel)**: 3-4h (both teams)
- **Plus dashboard**: +2-3h (not in this scope)
- **Plus GitHub bot**: +2-3h (not in this scope)

**Honest Timeline**: Original 5h for MVP is unrealistic if dashboard + bot included. But **Stage 2 CLI alone is 3-4h**, which fits.

**Cuts if time tight**:
1. Drop `report.ts` command (keep scan only)
2. Skip fancy progress bar (keep simple ASCII)
3. Skip PDF export (not in Stage 2 anyway)

---

### 4.2 Test Infrastructure Risk: "Zero test infrastructure"

**Stage 2 Test Coverage:**

| Test | File | Type | Status |
|------|------|------|--------|
| CLI entry point | cli.test.ts | Unit | ✓ Can run now |
| Config encryption | cli.test.ts | Unit | ⏳ Pending encryption decision |
| Error handling | cli.test.ts | Unit | ✓ Can run now |
| Progress formatting | cli.test.ts | Unit | ✓ Mock events |
| Scan command (mocked) | cli.test.ts | Integration | ✓ Can run now |
| --fix command (mocked) | cli.test.ts | Integration | ✓ Can run now |
| Fallback: cache | cli.test.ts | Integration | ✓ Mock timeout |
| Fallback: sandbox | cli.test.ts | Integration | ✓ Mock crash |
| **E2E (real engine)** | e2e.cli.test.ts | E2E | ✗ Blocked on Stage 1 |
| **Demo timing** | (bash script) | Manual | ✗ Blocked on Stage 1 |

**Success Criteria:**
- `bun test src/test/cli.test.ts` all pass (mocked, runnable now)
- `bun test src/test/e2e.cli.test.ts` all pass (real engine, after Stage 1)
- `demo.sh` completes <3 min (after Stage 1)

---

### 4.3 Security Risk: "Dashboard auth undefined, Dashboard public"

**Stage 2 Scope**: Store scans locally with file permissions:

```ts
// In report.ts after saving
fs.chmodSync(scanPath, 0o600); // readable/writable by owner only
```

**API Key Precedence** (Stage 2):
1. Env vars first (BRIGHT_DATA_API_KEY, etc.)
2. Config file fallback
3. If neither: error with helpful message

**Auth/Dashboard**: Stage 3 responsibility (GitHub OAuth, session management)

---

### 4.4 Patch Validation Risk: "Pre-baked patches OK, but what validates?"

**Responsibility Split:**

| Gate | Owner | How |
|------|-------|-----|
| Patch compiles | **Stage 1** | patcher.ts runs compiler |
| Re-run PoC | **Stage 1** | patcher.ts verifies fix works |
| **Patch applies cleanly** | **Stage 2** | scan-with-fix.ts runs `git apply --check` |
| User reviews before merge | User | Manual PR review |

**Stage 2 Specific**: Do NOT blindly apply patches. Validate with `git apply --check` first. If fails: show error + suggest manual review.

---

## Part 5: Security & Encryption Decision

### 5.1 GitHub Token Storage (CRITICAL BLOCKER)

**Three Options** (User Chooses One):

**Option A: OS Keychain**
```
Pros:
- Most secure (OS-managed storage)
- Standard practice (used by git, GitHub CLI)
Cons:
- Requires system setup
- Linux: libsecret (extra dependency)
- May fail in headless/Docker environments
- Migration to new machine requires re-auth
```

**Option B: AES-256-GCM with Machine ID** (RECOMMENDED)
```
Pros:
- Cross-platform (works on all OSes)
- No system setup required
- Reasonable security (symmetric encryption)
- Fallback to plaintext if key derivation fails
Cons:
- Key derived from machine fingerprint
- Migration requires re-auth
- Bun native crypto support (bun:crypto)
```

**Option C: Plaintext + 0600 Permissions**
```
Pros:
- Simplest (MVP honest)
- No extra dependencies
- Works immediately
Cons:
- Secret stored on disk unencrypted
- Anyone with filesystem access can read it
- Not suitable for production
- Only acceptable for hackathon MVP
```

**Recommended Choice**: **Option B (AES-256-GCM)**

---

### 5.2 File Permissions (Stage 2 Specific)

```ts
// ~/.codeprobe/ directory permissions
fs.mkdirSync(path.join(os.homedir(), '.codeprobe', 'scans'), {
  mode: 0o700, // drwx------: only owner can read/write/execute
  recursive: true
});

// Scan result file permissions
fs.writeFileSync(scanPath, JSON.stringify(report));
fs.chmodSync(scanPath, 0o600); // -rw------: only owner can read/write
```

**Audit Test:**
```bash
ls -la ~/.codeprobe/
# Should show: drwx------ ... .codeprobe
# Should show: -rw------- ... scans/latest.json
```

---

### 5.3 API Key Precedence (Config vs Environment)

```ts
// src/cli/config.ts
export async function getApiKey(
  service: 'BRIGHT_DATA' | 'DAYTONA' | 'NOSANA'
): Promise<string> {
  // 1. Check env var (takes precedence)
  const envKey = process.env[`${service}_API_KEY`];
  if (envKey) {
    console.log(`[info] Using ${service} key from environment variable`);
    return envKey;
  }
  
  // 2. Check config.json (falls back)
  const config = await loadConfig();
  const configKey = config[`${service.toLowerCase()}_api_key`];
  if (configKey) {
    console.log(`[info] Using ${service} key from ~/.codeprobe/config.json`);
    return decryptToken(configKey); // using chosen encryption method
  }
  
  // 3. Neither found: throw helpful error
  throw new Error(
    `No ${service} API key found.\n` +
    `Set env var: export ${service}_API_KEY=<key>\n` +
    `Or run: codeprobe config set ${service}_API_KEY <key>`
  );
}
```

---

## Part 6: Known Risks + Mitigations

| Risk | Likelihood | Stage 2 Mitigation | Test |
|------|------------|-------------------|------|
| Bright Data timeout during demo | Medium | Log warning, use cache (cve-cache.json) | Mock timeout in unit test |
| Daytona sandbox slow | Low | Timeout 60s (Stage 1); mark failed, continue | Measure real startup time |
| Git repo dirty on --fix | Medium | Detect `git status`, warn user, abort | Mock dirty repo in test |
| Network failure mid-scan | Low | Graceful error + cache partial results | Mock network error in test |
| Bun startup cold (<5s) | Low | Pre-warm before demo (run once offline) | Measure: `time bun src/cli/index.ts --help` |
| Config encryption fails | Medium | Fall back to plaintext + warn at runtime | Test encrypt/decrypt roundtrip |
| Stage 1 slips past Hour 2 | **HIGH** | Build Stage 2 with mocks, delay E2E | Plan assumes Stage 1 ready by Hour 2 |
| Patch apply fails (conflict) | Low | Show failed diff, suggest manual merge | Mock conflicting patch in test |

---

## Part 7: Test Strategy

### Test Coverage Matrix

```
Layer                      | Test File      | Type        | Runnable Now?
─────────────────────────────────────────────────────────────────────────
CLI entry point            | cli.test.ts    | Unit        | Yes (stub)
Config read/write          | cli.test.ts    | Unit        | Yes
Config encryption          | cli.test.ts    | Unit        | ⏳ (pending decision)
Error handling             | cli.test.ts    | Unit        | Yes
Progress formatting        | cli.test.ts    | Unit        | Yes (mock events)
Scan command (mocked)      | cli.test.ts    | Integration | Yes
Report formatting          | cli.test.ts    | Unit        | Yes (mock report)
--fix git flow (mocked)    | cli.test.ts    | Integration | Yes
Fallback: cache            | cli.test.ts    | Integration | Yes (mock timeout)
Fallback: sandbox crash    | cli.test.ts    | Integration | Yes (mock crash)
─────────────────────────────────────────────────────────────────────────
End-to-End (real engine)   | e2e.cli.test   | E2E         | No (Stage 1 blocker)
Demo script timing         | (bash script)  | Manual      | No (Stage 1 blocker)
```

### Test Execution Plan

**Phase 1 (Hours 0-2, parallel with Stage 1):**
```bash
# Test with mocked engine
bun test src/test/cli.test.ts
# Expected: ~12 tests pass (1 skipped if encryption pending)
```

**Phase 2 (Hour 3+, after Stage 1 ready):**
```bash
# End-to-end test
bun test src/test/e2e.cli.test.ts
# Expected: 3 tests pass (scan, report, --fix)
```

**Phase 3 (Hour 3.5+, before demo):**
```bash
# Full demo
bash demo.sh
# Expected: <3 minutes, no errors
time bash demo.sh
```

---

## Part 8: Files to Create/Modify

### NEW Files (Stage 2):

```
src/cli/index.ts                    Main entry point
src/cli/commands/scan.ts            `codeprobe scan` implementation
src/cli/commands/scan-with-fix.ts   `codeprobe scan --fix` (git)
src/cli/commands/report.ts          `codeprobe report` command
src/cli/config.ts                   Config + token management
src/cli/progress.ts                 Event → CLI output formatting
src/cli/errors.ts                   Error handling + fallbacks
src/shared/constants.ts             API timeouts, paths, defaults
src/shared/utils.ts                 Helpers (format score, colorize, etc.)
src/test/cli.test.ts                Unit + integration tests (mocked)
src/test/e2e.cli.test.ts            E2E test (real engine)
demo.sh                             Demo script (bash)
.env.example                        Template for API keys
```

### MODIFY Files (Existing):

```
package.json                        Add: chalk, table-cli, dayjs, zod, axios, crypto
                                    Add bin: "codeprobe": "src/cli/index.ts"
tsconfig.json                       Ensure strict: true
```

### REFERENCE Files (Stage 1 Output):

```
src/engine/index.ts                 runFullScan, ScanEvent interface
src/shared/types.ts                 Report, CVE, Scan types
cve-cache.json                      Fallback CVE data
patches.json                        Pre-baked patches
demo-vulnerable-app/                Demo repo
```

---

## Part 9: Acceptance Criteria (Stage 2)

**Must Pass (Non-Negotiable):**

1. ✓ `bun test src/test/cli.test.ts` all pass (unit + integration with mocks)
2. ✓ `bun run src/cli/index.ts scan ./demo-vulnerable-app` exits code 1 (vulns found)
3. ✓ Output includes "CVE-2023-44487" and "CONFIRMED EXPLOITABLE"
4. ✓ JSON report saved to `~/.codeprobe/scans/{id}.json` with valid schema
5. ✓ `scan --fix` creates git branch matching pattern `codeprobe-fix-*`
6. ✓ `scan --json` outputs valid, parseable JSON
7. ✓ File permissions: `~/.codeprobe/scans/` is `0700`, files are `0600`
8. ✓ Fallback works: If Bright Data times out, scan continues with cached data
9. ✓ `demo.sh` completes in <3 minutes without errors
10. ✓ `bun test src/test/e2e.cli.test.ts` passes (E2E, after Stage 1)

---

## Part 10: Open Decisions (User Confirmation Needed)

| Decision | Options | Blocker? |
|----------|---------|----------|
| **Token encryption method** | A: Keychain / B: AES-256-GCM / C: Plaintext | **YES** |
| API key precedence | Env-first (recommended) vs config-first | Medium |
| E2E environment | Local + real Daytona vs mocked | Low |
| Demo repo location | Subdirectory vs separate repo | Low |
| Scan history limit | Keep all or limit to N recent | Low |
| Pre-baked patches | Bake into codebase vs fetch from S3 | Low |

---

## Part 11: Critical Path Summary

### Sequential Dependency Chain

```
Stage 1 Contract Locked
    ↓
Stage 2 Scaffolding (immediate, 30m)
    ↓
Stage 1 Engine Works (Hour 2)
    ↓
Stage 2 Real Integration (Hour 2.5–3)
    ↓
Stage 2 E2E Test (Hour 3.5)
    ↓
Demo Rehearsal (Hour 4+)
```

### Critical Gates

1. **Gate 1: Token Encryption Decision** → Unblocks config.ts (due end of Hour 0)
2. **Gate 2: Stage 1 Engine Contract** → Unblocks real scan.ts (due Hour 1)
3. **Gate 3: Stage 1 Sandbox Working** → Unblocks E2E test (due Hour 2.5)
4. **Gate 4: Demo Repo Ready** → Unblocks demo.sh (due Hour 3)

---

## Part 12: Post-Hack ton Roadmap (Out of Scope)

- Multi-language support (Python, Rust, Java)
- GitHub bot auto-commenting on PRs
- CI/CD GitHub Action (SARIF export)
- MCP server for Claude Desktop
- Database + user accounts
- Supply chain monitoring
- Executive dashboard view
- Team collaboration

---

## Summary & Next Steps

### Do Now (Hour 0):

- [ ] Confirm Stage 1 contract with Stage 1 team
- [ ] **CRITICAL: Lock token encryption decision** (A/B/C)
- [ ] Scaffold Stage 2 directory structure + stubs
- [ ] Install dependencies: `bun install`

### During Build (Hours 0-3):

- [ ] Stage 2: Build config, CLI, progress, errors (mocked engine)
- [ ] Stage 1: Build parser, scraper, sandbox, report (parallel)
- [ ] Run `bun test src/test/cli.test.ts` frequently (mocked tests)

### After Stage 1 Ready (Hour 3+):

- [ ] Wire Stage 2 to real Stage 1 engine (replace mocks)
- [ ] Run `bun test src/test/e2e.cli.test.ts` (real engine)
- [ ] Run `bash demo.sh` 3-5 times (timing + rehearsal)
- [ ] Record fallback video (cache scenario)

---

**Status**: Ready to implement. Awaiting token encryption decision + Stage 1 contract confirmation.
