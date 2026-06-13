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
| **Demo CVEs** | Log4Shell (CVE-2021-44228) + HTTP/2 Rapid Reset (CVE-2023-44487) | Universal knowledge, RCE + DoS vector diversity, public PoCs exist, pre-tested |
| **Time Crunch Fallback** | CLI + bot first; cut MCP + CI if needed; preserve dashboard | Exploit verification is the "wow moment"; bot proves multi-interface capability |
| **Wow Moment** | Live sandbox exploit execution (real-time PoC success/failure proof) | Differentiates from theoretical scanning; judges see actual vulnerability confirmation |
| **GitHub Bot** | Real GitHub App + OAuth + PR comments + auto-fix PR creation | Shows production-grade integration, not a mock |
| **Business Messaging** | "$4.9M avg breach cost. This code: 2 confirmed RCE vulns = $9.8M risk averted if patched today." | One number, one action, business impact clear in 10 seconds |

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

### By End of Hour 1 (10:30–11:30): Setup + Core Engine
- [ ] Bun project initialized with TypeScript
- [ ] Dependency parser (Node.js package.json parsing)
- [ ] Bright Data scraper (test with NVD)
- [ ] Daytona sandbox basic (spawn, install package, run command)
- [ ] Nosana / Claude fallback (test patch generation)

### By End of Hour 2 (11:30–13:00): Orchestration
- [ ] Sandbox orchestrator (spawn 3 CVEs in parallel)
- [ ] Exploit runner (inject PoC script, capture output)
- [ ] Verification logic (succeeded/failed detection)
- [ ] Report builder (JSON structure)

### By End of Hour 3 (13:00–14:00): CLI
- [ ] `codeprobe scan` command (end-to-end on demo repo)
- [ ] `codeprobe scan --fix` (generate patches, commit to branch)
- [ ] Terminal output (colors, tables, progress)
- [ ] Config file (`~/.codeprobe/config`)

### By End of Hour 4 (14:00–15:00): Dashboard + Bot
- [ ] React dashboard (Technical view: CVE table, PoC evidence, patch diffs)
- [ ] Executive view: Risk score gauge, business impact callout
- [ ] GitHub bot webhook (PR comment posting)
- [ ] Auto-fix PR creation

### Hours 4.5–5 (15:00–16:30): Polish + Rehearsal
- [ ] Fix integration bugs
- [ ] Dashboard styling (Tailwind polish)
- [ ] Demo repo setup (2–3 intentional vulns)
- [ ] Pre-record fallback video (if Bright Data fails live)
- [ ] Rehearse 2-minute demo (3–5 times)

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
