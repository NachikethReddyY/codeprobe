# CodeProbe MVP — Preflight Plan

**Status:** Foundation Discovery Complete  
**Build Window:** 5 hours (hackathon)  
**Target Event:** AgentForge SG Super AI Edition, June 2026  

---

## Scope

### In Scope (Must Ship)
- Working CLI (`codeprobe scan`) with live exploit verification
- Bright Data CVE scraping (real integration)
- Daytona sandbox spawning + PoC execution
- Detailed terminal + JSON report output
- GitHub bot (real OAuth, PR comments + auto-fix PR creation)
- React dashboard (Technical + Executive views)
- Business impact messaging ($4.9M breach cost)

### Out of Scope (Nice to Have / Post-Hackathon)
- MCP server (too risky time-wise; skip for MVP)
- CI/CD GitHub Action (cut if time < 1 hour remaining)
- Multi-language support (Node.js only for MVP)
- Custom PoC upload
- Historical scan tracking / audit logs

### Demo Day Visible
- Live CLI scan of demo repo with real Bright Data + Daytona exploit execution
- 2 confirmed exploitable CVEs demonstrated
- GitHub bot commenting on a test PR
- Dashboard showing business impact

---

## Grill-Me Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Demo CVEs** | HTTP/2 Rapid Reset (CVE-2023-44487) ONLY (Log4Shell removed — Java/log4j incompatible with Node.js demo repo) | Log4Shell can't work in Node.js repo + requires outbound callbacks incompatible with isolated sandbox. HTTP/2 is DoS, works in isolation, Node.js compatible, public PoCs exist. |
| **Time Crunch Fallback** | **Revised priority**: CLI + exploit verification first (non-negotiable). Dashboard minimal second. Bot + GitHub OAuth as stretch. MCP + CI cut. | Exploit verification is the only "wow moment" that matters. Everything else is bonus. |
| **Wow Moment** | Live sandbox exploit execution (real-time PoC success/failure proof) — HTTP/2 DoS verified in isolated container | Differentiates from theoretical scanning; judges see actual vulnerability confirmation with pre-baked patches as fallback. |
| **GitHub Bot** | Cut from MVP unless time allows (2-3h for OAuth + webhook setup) | Exploit verification alone is sufficient for hackathon. Bot is nice-to-have, not must-have. |
| **Patch Generation** | Pre-bake patches for demo CVEs into codebase + validate harness for LLM fallback | Zero failure risk on patches. LLM (Nosana/Claude) generation is stretch goal with validation test. |
| **Dashboard Auth** | GitHub OAuth required (scan results are sensitive security data) | Without auth, anyone with scan URL can view CVE details, PoCs, patches — IDOR vulnerability. Implement simple login. |

---

## Foundations (Nine Technical Locks)

| # | Area | Decision | Notes |
|----|------|----------|-------|
| 1 | **Schema** | Simple JSON: `{ scan_id, timestamp, repo_url, cves: [{id, severity, exploitable, patch_diff}], risk_score }` | No database (MVP); filesystem storage `~/.codeprobe/scans/` + S3 for dashboard |
| 2 | **TypeScript** | TypeScript strict mode + shared types across CLI, engine, bot, dashboard | `src/shared/types.ts` for all data contracts |
| 3 | **Validation** | Zod for runtime schema validation (repo URLs, CVE data, patch diffs) | Zero runtime overhead post-validation; lightweight for Bun |
| 4 | **Routing** | REST API: POST `/api/scan` (start), GET `/api/scan/:id` (status), GET `/api/results/:id` (full report) | Stateless, simple webhooks for bot |
| 5 | **Auth** | GitHub OAuth for bot + CLI (store encrypted in `~/.codeprobe/auth.json`). Sponsor API keys as env vars. | No user accounts (MVP). OAuth flow pre-tested. |
| 6 | **CSS** | TailwindCSS for dashboard React app | Fast, responsive utilities, no build friction |
| 7 | **UI Framework** | React 18 + Vite for dashboard. Terminal UI (chalk + table-like output) for CLI. | No heavy Terminal UI framework; keep CLI simple |
| 8 | **Client-Server** | **Streaming** (Server-Sent Events). CLI spawns local scan engine, polls/streams progress via event emitter. | Event-driven; CLI sees real-time: "Scraping...", "Spinning up...", "Exploit running...", "Done." |
| 9 | **Folders** | Monorepo: `src/cli`, `src/engine`, `src/dashboard`, `src/bot`, `src/shared`. Each is independently testable. | Clear boundaries; minimal cross-module coupling. |

---

## Architecture Overview

```
CLI (Bun CLI executable)
  ↓
Local Engine (dependency parser, CVE matcher, sandbox orchestrator)
  ↓
Bright Data (async CVE scraping)
  ↓
Daytona (sandbox pool, exploit runner)
  ↓
Nosana LLM or Claude API (patch generation)
  ↓
Report Builder (JSON + formatted output)
  ↓
Dashboard (React, pulls latest scan from S3/local cache)
  ↓
GitHub Bot (webhook handler, PR comments, auto-fix)
```

---

## Data Flow

1. **CLI Input**: `codeprobe scan <repo-url-or-local-path>`
2. **Dependency Parsing**: Extract versions from `package.json`, `package-lock.json`
3. **CVE Scraping**: Bright Data scrapes NVD, Exploit-DB, Snyk (parallel, 30s target)
4. **CVE Matching**: Semver matching of dependencies to known CVEs
5. **Sandbox Spawning**: Daytona creates isolated containers for CRITICAL CVEs (3 at a time)
6. **Exploit Execution**: PoC script runs in sandbox, captures output/filesystem/network
7. **Verification**: Exploit succeeded = "Confirmed Exploitable"; failed = "Theoretical Risk"
8. **Patch Generation**: Nosana LLM generates code diffs (or pre-baked fallback)
9. **Report Output**: JSON saved locally, uploaded to S3, displayed in dashboard + CLI
10. **GitHub Bot**: Webhook fetches latest scan, posts PR comment, offers auto-fix PR

---

## MVP Deliverables

### Hour 0 (Prep, before build): Critical Setup
- [ ] Bun project with TypeScript strict mode + shared types
- [ ] Provision Bright Data, Daytona, Nosana API keys
- [ ] Create demo repo with HTTP/2 vulnerable server
- [ ] Pre-generate + validate patches for demo CVE
- [ ] Test Daytona sandbox spawn + exploit execution (offline)
- [ ] Set up GitHub OAuth test app (if dashboard included)

### Hour 1 (0:00–1:00): Core Engine + CLI Bootstrap
- [ ] Bun project initialized with TypeScript
- [ ] Dependency parser (Node.js package.json parsing)
- [ ] Bright Data scraper (test with NVD — fallback to cached JSON if fails)
- [ ] Daytona sandbox integration (spawn, install, run PoC)
- [ ] Report builder (JSON schema: scan_id, CVEs, risk_score, patches)
- [ ] CLI `codeprobe scan` command skeleton

### Hour 2 (1:00–2:00): Orchestration + Exploit Verification
- [ ] Sandbox orchestrator (single CVE execution, capture output)
- [ ] Exploit runner (inject PoC script, timeout + retry logic)
- [ ] Verification logic (exploit succeeded/failed detection)
- [ ] CLI end-to-end test on demo repo (live Bright Data + Daytona)
- [ ] Terminal output (colors, progress, results table)

### Hour 3 (2:00–3:00): Validation + Fallbacks
- [ ] LLM patch generation (pre-baked patches + Nosana/Claude fallback with validation)
- [ ] Error handling (Bright Data fails → cached CVE data, Daytona crashes → retry)
- [ ] Config file (`~/.codeprobe/config`, GitHub auth token storage)
- [ ] `codeprobe scan --fix` branch creation + commit
- [ ] Full integration test (CLI start-to-finish on demo repo)

### Hour 4+ (3:00–5:00): Dashboard (if time) + Polish
- **If 4+ hours available**: React dashboard (Technical view only) + GitHub OAuth login
  - [ ] Scan history list + detail view
  - [ ] Risk score display + CVE table
  - [ ] Patch diff viewer
  - [ ] GitHub OAuth integration
- **Always by 5:00**: Demo rehearsal (3–5 times), record fallback video, final bug fixes

### Stretch Goals (if time > 5h, include ONLY if time safe):
- [ ] Executive view (business impact messaging)
- [ ] GitHub bot webhook (PR comments, auto-fix PR)
- [ ] SARIF output for CI/CD

---

## Risk Assessment (Pre-Preflight)

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Bright Data rate-limited during demo | Medium | Pre-cache CVE data; have offline mode |
| Daytona sandbox timeout | Low | Retry logic (max 2 retries); mark as "Verification Failed" |
| Nosana cold start > 60s | Medium | Pre-test; have Claude API fallback ready |
| GitHub OAuth fails demo day | Low | Test pre-hackathon; have manual token fallback |
| Patch generation broken | Medium | Pre-generate 2–3 patches for demo CVEs; bake into dashboard |
| Scope creep / time overrun | High | **Strict cut order: skip MCP → skip CI → skip dashboard polish → keep CLI + bot + exploit** |

---

## Success Criteria

**MVP Demo Must Show:**
1. Live Bright Data scraping
2. Daytona sandbox spawning
3. PoC exploit running in sandbox
4. Output: 2 CVEs marked "Confirmed Exploitable"
5. Patch generated (or shown as example)
6. GitHub bot commenting on a PR
7. Business impact messaging (judge understands $4.9M value)

**Non-negotiable:**
- Working CLI
- Real Daytona exploit verification
- Real GitHub bot (not mock)
- Business impact clear

---

## Known Unknowns

None. All decisions locked. Sponsor API keys provisioned. Ready to preflight agent review.
