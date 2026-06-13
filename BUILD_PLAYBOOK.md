# CodeProbe MVP — Build Playbook
**Event:** AgentForge SG Super AI Edition (June 2026)  
**Timeline:** 6–7 hours  
**Teams:** Up to 3 engineers (can work in parallel or sequentially)

---

## Overview

This playbook coordinates the **3 independent stages** needed to ship a working MVP for the hackathon. Each stage is **self-contained** so teams can pick it up and work on it independently, or hand off between people.

**Critical Path:** Stage 1 → Stage 2 → Stage 3 (sequential)  
**Parallel Work:** Stage 1 + Stage 2 (backend) can work in parallel if 2 engineers; Stage 2 (CLI) + Stage 3 (dashboard) can run in parallel after Stage 1 done.

---

## What You're Building

```
CLI (Bun CLI executable)
    ↓
Core Engine (parser, scraper, sandbox, report)
    ↓
Real-Time Exploit Verification (Daytona)
    ↓
Dashboard (React) + GitHub OAuth
    ↓
Judges See: Exploit confirmed + Business impact ($4.9M risk)
```

**The "Wow Moment":** Live sandbox runs HTTP/2 DoS exploit, succeeds, shows as "CONFIRMED EXPLOITABLE" in dashboard. Judges understand: "This isn't theoretical — we verified the exploit works."

---

## Stage 1: Core Engine (0–2 hours)
**File:** [STAGE_1_SETUP_ENGINE.md](./STAGE_1_SETUP_ENGINE.md)  
**Team:** 1–2 engineers  
**Deliverable:** Working Bun project with dependency parser, CVE scraper, Daytona sandbox integration, report builder.

**What Gets Built:**
- Dependency parser (extract from package.json)
- Bright Data CVE scraper (with fallback to cached JSON)
- Daytona sandbox spawner (isolated container for PoC exploit)
- Pre-baked patch system (guaranteed-working patches for demo CVE)
- JSON report builder
- Integration test (full pipeline working)

**Success Metric:** `bun test` passes. Engine runs end-to-end on demo repo, produces valid JSON report with "CONFIRMED EXPLOITABLE" for HTTP/2 CVE.

**Key Decisions Locked:**
- Demo CVE: **HTTP/2 Rapid Reset (CVE-2023-44487)** only (Log4Shell removed — Java incompatible with Node.js demo repo)
- Patches: Pre-baked + LLM fallback with validation
- Fallbacks: Bright Data fails → cached JSON. Daytona crashes → retry once.

**Dependency Chain:** None (can start immediately)

**Blocker for Stage 2/3:** None — can start Stage 2 while Stage 1 finishes

---

## Stage 2: CLI + Verification (2–4 hours)
**File:** [STAGE_2_CLI_VERIFICATION.md](./STAGE_2_CLI_VERIFICATION.md)  
**Team:** 1 engineer (can overlap with Stage 1)  
**Dependency:** Stage 1 must compile + test pass  

**What Gets Built:**
- CLI entry point (`codeprobe scan`, `codeprobe scan --fix`, `codeprobe report`)
- Real-time progress logging (events from engine → CLI output)
- Config management (GitHub token, API keys)
- Error handling + fallback logic (graceful degradation)
- Git integration (`--fix` creates branch, commits patches)
- Integration tests (full CLI tested)
- Demo script (for easy rehearsal)

**Success Metric:** `codeprobe scan ./demo-vulnerable-app` completes in <3 minutes, shows risk score + "CONFIRMED EXPLOITABLE", `--fix` creates git branch.

**Key Decisions Locked:**
- CLI Framework: No heavy framework, use chalk + table.js
- Real-time: Event emitter (engine) → CLI polls/logs progress
- Exit codes: 0 = success, 1 = vulns found, 2 = scan failed
- Fallbacks: Bright Data fail → use cache, Daytona crash → continue with "verification failed"

**Blocker for Stage 3:** CLI must work end-to-end (so dashboard has valid scan results to display)

**Parallel Work:** Can start Stage 3 (dashboard) design while waiting for Stage 2 to finish, but needs sample JSON scan to work with.

---

## Stage 3: Dashboard + Auth + Polish (4–7 hours)
**File:** [STAGE_3_DASHBOARD_POLISH.md](./STAGE_3_DASHBOARD_POLISH.md)  
**Team:** 1–2 engineers (1 frontend + 1 backend for API/auth)  
**Dependency:** Stage 2 must produce valid scan JSON  

**What Gets Built:**
- REST API (list scans, get details, OAuth callback)
- GitHub OAuth integration (login, token storage)
- React dashboard (scans list, scan detail view)
- CVE table (severity, status, patch info)
- **Business Impact callout** (RED BOX, "$4.9M breach risk" — judges MUST see this)
- Patch diff viewer (syntax highlighted)
- Error + empty states (no silent failures in security tool)
- Responsive design (mobile, tablet, desktop)
- Integration tests + demo rehearsal

**Success Metric:** Dashboard loads in <2s, GitHub OAuth works, judges understand business impact of confirmed CVE.

**Key Decisions Locked:**
- Framework: React 18 + Vite (via Bun HTML imports, no separate build)
- Styling: TailwindCSS
- Auth: GitHub OAuth (same token as CLI)
- Views: Technical view only (Executive view cut to save time)
- Data: Read from `~/.codeprobe/scans/` (stateless, no database)

**Blocker for Demo Day:** All stages must pass. If dashboard not ready, can show results via CLI + fallback video.

**Stretch Goals (if time > 6h):**
- PDF export
- Scan sharing (one-time links)
- Supply chain warning banner

---

## Critical Path Timeline

```
Hour 0: Prep (API keys provisioned, demo repo ready)
Hours 0–2:   Stage 1 (Core Engine)           [E1, E2]
Hours 1–3:   Stage 2 (CLI) starts after S1   [E1]
Hours 3–5:   Stage 3 (Dashboard) starts after S2 [E2, E3]
Hours 5–7:   Polish + demo rehearsal        [All hands]
Hour 7:      Demo day!
```

**If running in parallel (2–3 engineers):**
- **Engineer 1:** Stage 1 (0–2h) → Stage 2 CLI (2–4h) → Demo rehearsal (4–7h)
- **Engineer 2:** Stage 1 support (0–2h) → Stage 3 Dashboard (3–7h) → Demo rehearsal (4–7h)

**If running sequentially (1 engineer):**
- Stages run 0–2h → 2–4h → 4–7h
- Must prioritize ruthlessly: CLI + exploit verification > Dashboard > Polish

---

## Shared Resources

### API Keys / Credentials
- `BRIGHT_DATA_API_KEY` (CVE scraping, Bright Data)
- `DAYTONA_API_KEY` (sandbox provisioning)
- `NOSANA_API_KEY` (LLM patch generation, optional)
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (OAuth for dashboard)
- Store in `.env` (not committed to git)

### Demo Repository
- Created during Stage 1 prep
- Contains HTTP/2 vulnerable server
- Path: `demo-vulnerable-app/` (local or separate repo)
- Must work with Stage 1 parser + Stage 2 CLI

### Pre-Baked Patches
- `patches.json` (created in Stage 1)
- Fallback if LLM patch generation fails
- Guaranteed to work (tested locally before demo)

### Cache Files
- `cve-cache.json` (fallback if Bright Data fails)
- `~/.codeprobe/scans/` directory (scans saved here)
- Sync these between machines if teams work on different laptops

---

## Stage Dependencies

```
Stage 1 (Engine)
  ├─ Required by: Stage 2, Stage 3
  └─ Blockers: API keys provisioned, demo repo ready

Stage 2 (CLI)
  ├─ Requires: Stage 1
  ├─ Required by: Stage 3
  └─ Blockers: Valid scan JSON in ~/.codeprobe/scans/

Stage 3 (Dashboard)
  ├─ Requires: Stage 1, Stage 2
  ├─ Required by: Demo day
  └─ Blockers: GitHub OAuth app registered
```

---

## Handoff Protocol (Multi-Team)

If different people work on different stages:

**End of Stage 1 (Engineer 1 → Engineer 2):**
```
Push to: git branch stage-1-engine
Create summary:
  - All tests passing ✓
  - CLI can run `bun run src/cli/index.ts scan ./demo-vulnerable-app`
  - JSON report at ~/.codeprobe/scans/{id}.json
  - Known issues: (any API timeout patterns observed)
  - Cache files: cve-cache.json, patches.json both present
```

**End of Stage 2 (Engineer 1 → Engineer 2):**
```
Push to: git branch stage-2-cli
Create summary:
  - CLI fully functional, all tests passing ✓
  - `codeprobe scan` produces valid output in <3 min
  - `codeprobe scan --fix` creates git branch + commits
  - Known timing: Sandbox takes Xs, scraping takes Ys (for dashboard UX)
  - Dashboard should expect scan JSON at path: ~/.codeprobe/scans/latest.json
```

**End of Stage 3:**
```
Push to: main or stage-3-dashboard
Demo rehearsal completed 3–5 times
Fallback video recorded: demo-fallback-video.mp4
Ready for hackathon demo!
```

---

## Demo Day Checklist

**30 minutes before demo:**
- [ ] Start CLI scan (dry run on demo repo)
- [ ] Verify exploit verification works (shows "CONFIRMED EXPLOITABLE")
- [ ] Start API server: `bun run src/api/server.ts`
- [ ] Start Vite dashboard: `bun run dev`
- [ ] Test OAuth login
- [ ] Verify dashboard loads recent scan
- [ ] Check internet connection (for Bright Data scraping)
- [ ] Have fallback video ready (`demo-fallback-video.mp4`)
- [ ] Charge laptop + have power cable nearby

**During demo (2 minutes):**
1. **CLI Scan (0–1 min):** Run `codeprobe scan ./demo-vulnerable-app`, show real-time progress, result: "1 CONFIRMED EXPLOITABLE, 2 THEORETICAL"
2. **Dashboard (1–1.5 min):** Open browser, show dashboard, risk score gauge, business impact callout ($4.9M), patch diff
3. **Patch Application (1.5–2 min):** Show `codeprobe scan --fix` created git branch, code diffs, explain judges could merge PR to fix

**If live demo fails:** Play fallback video, then walk judges through dashboard + explain architecture (less impressive but still demonstrates concept)

---

## Time Buffers + Contingencies

| Scenario | Mitigation |
|----------|-----------|
| Stage 1 takes 3h instead of 2h | Stage 2 starts late, compress CLI polish. Keep Stage 3 (dashboard) start on time by having 2nd engineer prep meanwhile. |
| Bright Data API fails | Use cached CVE data (pre-load `cve-cache.json`). Demo still works, show fallback logic. |
| Daytona sandbox slow | Pre-test sandbox startup time. If >30s/CVE, adjust demo expectations. Can pre-record sandbox execution for fallback. |
| GitHub OAuth setup fails | Hardcode demo token for demo day (not secure, but works). Move OAuth auth to post-demo polish. |
| Dashboard slow to load | Pre-optimize: lazy-load CVE details, pagination (10 CVEs at a time), code split pages. |
| No time for dashboard polish | Cut CSS perfection. Keep functional + usable. Business impact callout must be visible. |

**Hard constraints:**
- CLI must work (non-negotiable)
- Exploit verification must work (the whole point)
- Business impact message must be clear (judges need to understand "$4.9M risk")

**First cuts if time is tight:**
1. Dashboard CSS polish (keep functional, bare-bones styling)
2. PDF export
3. Supply chain warnings
4. Responsive design (test on desktop only, tablet/mobile as nice-to-have)
5. Error state polish (keep errors functional, not pretty)

---

## Success Criteria (Hackathon Judging)

**Must Ship for MVP to Work:**
- ✅ Working CLI that scans a repo
- ✅ Live Bright Data + Daytona integration
- ✅ Real exploit verification (not theoretical)
- ✅ At least 1 confirmed exploitable CVE in demo
- ✅ Patches generated (pre-baked or LLM)
- ✅ Business impact messaging ($4.9M)

**Strong Demo (Judges Impressed):**
- ✅ Dashboard with scan results
- ✅ Risk score visualization
- ✅ GitHub OAuth working
- ✅ Patch diff viewer
- ✅ Real-time progress (judges see it happen live)

**Nice to Have (Polish):**
- ✅ GitHub bot (cut from MVP scope, post-hackathon)
- ✅ CI/CD GitHub Action (cut from MVP scope)
- ✅ MCP server (cut from MVP scope)
- ✅ Executive view (cut from MVP scope, kept Business Impact callout)

---

## Common Mistakes to Avoid

❌ **Don't:**
- Try to add GitHub bot in Stage 2 (cuts into time, Stage 2 must ship)
- Skip pre-baking patches (LLM fallback is a stretch, demo must work)
- Ignore error states (silence in security tools is dangerous)
- Forget business impact messaging (judges won't understand value without it)
- Over-engineer dashboard (basic React + TailwindCSS is enough)
- Skip fallback video (network fails, APIs timeout — always have backup)

✅ **Do:**
- Lock demo CVE early (HTTP/2, no Log4Shell)
- Test end-to-end on demo repo before final demo
- Pre-record fallback video (insurance policy)
- Keep CLI + exploit verification as core (everything else is bonus)
- Polish business impact callout (red box, $4.9M, judges see it first)
- Rehearse demo 3–5 times before hackathon day

---

## Questions?

Each stage file (STAGE_1, STAGE_2, STAGE_3) has:
- Detailed deliverables
- Acceptance criteria
- Known risks + mitigations
- Setup checklist
- Test cases
- Files to create/modify

**Start with:** Read the stage file for your assigned stage, follow the checklist, build iteratively, run tests.

**Got stuck?** Check the "Known Risks" section of your stage file — likely mitigation is already documented.

---

## Post-Hackathon Roadmap

If the team continues (not in scope for MVP):
- [ ] Multi-language support (Python, Rust, Java)
- [ ] GitHub bot auto-commenting on PRs
- [ ] CI/CD GitHub Action
- [ ] MCP server for Claude Desktop
- [ ] Database + user accounts
- [ ] Supply chain attack monitoring
- [ ] Executive dashboard view
- [ ] Team collaboration features

---

**Go ship the MVP. See you on demo day! 🚀**
