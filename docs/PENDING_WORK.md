# CodeProbe: Pending Work Inventory

## Quick Status Summary

```
FULLY WORKING (Green):  CLI scan, Dashboard views, API server, Parser
PARTIALLY WORKING (Yellow): Patch application, Bot framework, Scraper (ejs only)
NOT WORKING (Red):      Real Daytona, Real Nosana, Real Bright Data, Bot scanning
MOCKED/SIMULATED:       Sandbox exploits (realistic demo), Patch generation
```

**Overall: 65% Complete** — Ready for demo, needs work for production

---

## WHAT'S WORKING ✅

### Frontend (100% Functional)
- ✅ Dashboard loads at http://localhost:3000
- ✅ GitHub OAuth login flow
- ✅ Scans list page (paginated, filtered, sorted)
- ✅ Scan detail page (risk gauge, CVE list, patch diffs)
- ✅ Business impact card ($4.9M)
- ✅ All components render correctly
- ✅ API calls working (GET /api/scans, /api/scans/{id})

### CLI (95% Functional)
- ✅ `scan` command — End-to-end working
- ✅ `report` command — Works
- ✅ `config` command — Works
- ✅ JSON output — Works
- ✅ Verbose logging — Works
- ❌ `--fix` flag — Creates branch but doesn't apply patches to files

### Backend/API (90% Functional)
- ✅ API server serves dashboard HTML
- ✅ API endpoints working (/api/scans, /api/auth)
- ✅ File-based scan storage working
- ✅ OAuth integration working
- ✅ Error handling working

### Engine (Core Pipeline) (80% Functional)
- ✅ Parser — Reads package.json correctly
- ✅ Matcher — Matches CVEs to dependencies
- ✅ Risk scoring — Calculates 0-10 scale
- ⚠️ Scraper — Works for ejs, empty for others
- ⚠️ Sandbox — Simulates ejs RCE, realistic output
- ⚠️ Patcher — Returns pre-baked patches only

### Tests (100% Passing)
- ✅ 25/25 tests pass
- ✅ Engine tests pass
- ✅ CLI tests pass
- ✅ Dashboard tests pass

---

## WHAT'S PENDING (INCOMPLETE) 🔴

### High Priority (Blocks Demo)

| Feature | Issue | Impact | Fix Time |
|---------|-------|--------|----------|
| **Patch Application** | --fix creates branch but doesn't modify files | Users can't apply patches | 30 min |
| **GitHub Bot Scanning** | Bot receives webhooks but doesn't scan repos | Can't scan PRs automatically | 2 hours |
| **API Authentication** | Dev mode accepts any token; no production auth | Can't deploy to prod securely | 1 hour |

### Medium Priority (Nice to Have for Demo)

| Feature | Issue | Impact | Fix Time |
|---------|-------|--------|----------|
| **Real Daytona Integration** | Sandbox exploits are simulated | Can't verify real vulnerabilities | 4 hours |
| **Real Nosana Integration** | Patches are pre-baked only | No LLM-generated fixes | 4 hours |
| **Multi-Language Support** | Only Node.js (npm) works | Can't scan Python/Rust/Go/Java repos | 2+ days |
| **WebSocket Updates** | Dashboard doesn't auto-refresh | No real-time progress | 2 hours |

### Low Priority (Post-Hackathon)

| Feature | Issue | Impact | Fix Time |
|---------|-------|--------|----------|
| **Database** | File-based storage only | No persistent history, no scaling | 1 day |
| **MCP Full Integration** | Framework exists, no repo ops | Can't use from Claude Desktop | 2 hours |
| **Production Deployment** | Hardcoded localhost everywhere | Can't run on servers | 2 hours |
| **Audit Logs** | No logging of actions | Can't track who did what | 3 hours |

---

## WHAT'S MOCKED (INTENTIONAL) 🎭

### For MVP Demo (Acceptable)

1. **Daytona Sandbox** → Simulates ejs RCE exploit
   - Returns realistic output
   - Works for demo, not production
   - **To use real Daytona**: Requires Docker/K8s, ~4 hours

2. **Nosana Patch Generation** → Returns pre-baked patches
   - Demonstrates what patches would look like
   - Only ejs@3.1.6 → 3.1.7 defined
   - **To use real Nosana**: Requires GPU account, ~4 hours

3. **Bright Data Scraping** → Falls back to NVD API
   - Demonstrates what Bright Data would do
   - Only ejs CVE-2022-29078 tested
   - **To use real Bright Data**: Requires account, ~2 hours

---

## SPECIFIC PENDING ITEMS BY COMPONENT

### Frontend (src/dashboard/) — 95% DONE

**Working:**
```
✅ frontend.tsx — Multi-page SPA
✅ LoginPage.tsx — GitHub OAuth
✅ ScansListPage.tsx — Lists scans
✅ ScanDetailPage.tsx — Shows details
✅ RiskGauge.tsx — Draws gauge
✅ CVETable.tsx — Lists CVEs
✅ BusinessImpactCard.tsx — Shows $4.9M
✅ PatchDiffViewer.tsx — Shows diffs
✅ useAuth.ts — Token management
✅ useScan.ts — API calls
```

**Pending:**
```
❌ Executive/Technical view toggle
❌ Real-time WebSocket updates
❌ PDF export
❌ Trend analysis (historical)
⚠️ Hardcoded GitHub client ID (should be env var)
⚠️ Hardcoded CORS origin
```

### Backend (src/api/) — 90% DONE

**Working:**
```
✅ server.ts — Serves HTML + API
✅ /api/scans — Lists scans
✅ /api/scans/{id} — Gets scan
✅ /api/auth/github — OAuth callback
✅ CORS headers
```

**Pending:**
```
❌ Production authentication (JWT)
❌ Webhook signature verification
❌ Database integration
⚠️ Hardcoded dev auth bypass
```

### Engine (src/engine/) — 80% DONE

**Working:**
```
✅ parser.ts — Reads package.json
✅ matcher.ts — Matches CVEs
✅ report.ts — Saves scans
```

**Partially Working:**
```
⚠️ scraper.ts — Only ejs works, others empty
⚠️ sandbox.ts — Simulates ejs, not real Daytona
⚠️ patcher.ts — Pre-baked only, no LLM
```

**Pending:**
```
❌ Multi-language support (Python, Rust, etc.)
❌ Real Daytona integration
❌ Real Nosana integration
❌ Real Bright Data integration
```

### CLI (src/cli/) — 95% DONE

**Working:**
```
✅ index.ts — Command dispatch
✅ commands/scan.ts — Scan execution
✅ commands/report.ts — Display results
✅ config.ts — Token management
✅ progress.ts — Progress logging
```

**Partially Working:**
```
⚠️ commands/scan-with-fix.ts — Creates branch but doesn't apply patches
```

**Pending:**
```
❌ Actual file modification for --fix
❌ Git push integration
```

### Bot (src/bot/) — 30% DONE

**Working:**
```
✅ server.ts — Webhook listener
✅ Posts initial comment
```

**Pending:**
```
❌ Clone repository
❌ Run engine.scan()
❌ Update PR comment with results
❌ Create auto-fix PR
❌ Webhook signature verification
```

### MCP (src/mcp/) — 30% DONE

**Working:**
```
✅ server.ts — JSON-RPC listener
✅ Tool definitions (scan_repository, get_scan_results, etc.)
```

**Pending:**
```
❌ Actual repo cloning
❌ Scan execution
❌ Patch application
❌ Full integration with Claude Desktop
```

### CI/CD (.github/workflows/) — 100% DONE

```
✅ Workflow runs on every PR
✅ Executes scan
✅ Uploads SARIF
✅ Posts results in PR comment
```

---

## QUESTIONS BEFORE I PROCEED ❓

Before I start fixing everything, I need to clarify your priorities:

### 1. **Demo Scope**
   - **Option A**: Fix only what's needed for hackathon judging (60% effort)
   - **Option B**: Make everything production-ready (200% effort)
   - **Option C**: Fix critical path + real integrations (120% effort)

### 2. **Sponsor APIs**
   - **Option A**: Keep mocks, just add branding ✅ (DONE)
   - **Option B**: Actually integrate real Daytona/Nosana/Bright Data APIs (8+ hours)
   - **Option C**: Keep mocks but make them more realistic (2 hours)

### 3. **Backend Features**
   - **Priority 1**: Fix patch application (--fix flag actually modifies files)? (Yes/No)
   - **Priority 2**: Implement bot scanning? (Yes/No)
   - **Priority 3**: Add database instead of files? (Yes/No)
   - **Priority 4**: Multi-language support? (Yes/No)

### 4. **Frontend Enhancements**
   - **Priority 1**: Fix hardcoded values (Client ID, CORS)? (Yes/No)
   - **Priority 2**: Add Executive/Technical view toggle? (Yes/No)
   - **Priority 3**: Add WebSocket updates? (Yes/No)

### 5. **Tests**
   - **Option A**: Keep unit tests only
   - **Option B**: Add E2E tests (Playwright) for dashboard
   - **Option C**: Add integration tests for full pipeline

---

## WHAT I RECOMMEND 💡

**For Hackathon (Next 2 hours):**
1. ✅ Fix patch application (--fix flag)
2. ✅ Remove hardcoded values (env vars)
3. ✅ Fix bot framework to actually scan
4. ✅ Add simple E2E test showing full flow
5. ✅ Clean up demo data

**For Production (After hackathon):**
1. Real Daytona/Nosana/Bright Data integration
2. Database instead of files
3. JWT authentication
4. Multi-language support
5. Monitoring/alerting

---

## Please Answer These 5 Questions:

1. **What's your priority: Demo perfect OR All features working?**
2. **Do you want real sponsor APIs or keep the mocks?**
3. **How much time do you have? (1 hour? 4 hours? Full day?)**
4. **Should I focus on backend or frontend first?**
5. **Should I add tests or just fix the code?**

Once you answer, I'll:
- Create a detailed fix plan
- Implement fixes in order of priority
- Test everything end-to-end
- Commit and push to main
