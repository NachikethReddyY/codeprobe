# CodeProbe - Product Requirements Document

## 1. Overview

**Feature Name:** CodeProbe  
**Status:** Draft (Hackathon MVP)  
**Date:** June 2026  
**Version:** 1.0  
**Author:** Nachiketh Reddy  
**Target Event:** AgentForge SG Super AI Edition, SMU School of Economics, June 2026

**Problem:** 60% of data breaches in 2026 involve vulnerabilities where a patch was already available and not applied. SAST tools like Snyk and Dependabot identify CVEs theoretically present in dependencies, but cannot confirm whether a specific codebase is actually exploitable. Engineers deprioritize patches based on theoretical risk, leading to breaches.

**Proposed Solution:** An autonomous AI agent that confirms which CVEs are actually exploitable in a target codebase by running known proof-of-concept exploits in isolated sandboxes, then generates verified patches. Accessible via CLI, GitHub bot, CI/CD integration, and MCP.

**Primary Goal:** Win first place at AgentForge SG hackathon.  
**Secondary Goal:** Demonstrate production-ready architecture that could scale post-hackathon.

---

## 2. Background & Context

**Problem Statement:**  
Modern development teams face vulnerability overload. SAST scanners report hundreds of theoretical CVEs per project. The median time to patch a critical vulnerability is 60+ days, while exploit-to-breach time has dropped to hours. The gap between "vulnerability exists" and "vulnerability is exploitable in this specific codebase" is where engineering teams lose prioritization signal.

**Justification:**  
- Verizon DBIR 2026: 60% of breaches used known, patched CVEs  
- IBM Cost of Breach 2026: Average breach costs $4.9M  
- 290k+ CVEs indexed globally as of early 2026, growing 25% YoY  
- No existing product confirms exploitability through live sandbox execution

**Goals:**  
- Ship a working end-to-end MVP within 5-hour build window  
- Demonstrate all three sponsor APIs (Daytona, Bright Data, Nosana) with meaningful integration  
- Build three interfaces (CLI, GitHub bot, CI/CD) to show product flexibility  
- Pass the hackathon judging criteria: Completeness (working MVP), Innovation (live exploit verification), Real-Life Problem Solving ($4.9M breach cost), Sponsored Product Usage (deep, natural integration)

---

## 3. User Personas

**Primary Persona: Security-Conscious Developer**  
Name: Alex, Senior Backend Engineer at a 50-person startup  
Technical Level: High  
Pain: Receives 200+ Dependabot alerts weekly. Cannot tell which ones matter. Spends hours triaging theoretical risks.  
Goal: Ship code fast without missing the vulnerability that actually matters.

**Secondary Persona: DevOps Engineer**  
Name: Priya, DevOps Lead at a mid-size SaaS company  
Technical Level: High  
Pain: Manages CI/CD pipelines, responsible for security gates. Needs automated tools that don't slow down deployments with false positives.  
Goal: Integrate security checks that give clear go/no-go signals.

**Tertiary Persona: Technical Founder/CTO**  
Name: Marcus, CTO of an early-stage startup  
Technical Level: Medium-High  
Pain: Needs to understand security posture for investor due diligence. Non-technical board members ask "are we secure?" and he has no concrete answer.  
Goal: A clear, visual report showing confirmed vs theoretical risks in business terms.

---

## 4. User Stories

**As a developer running the CLI,**  
I want to scan my local repository for vulnerabilities,  
So that I can see which CVEs are confirmed exploitable before I commit.

**As a developer running the CLI with --fix,**  
I want CodeProbe to generate patches and push them to a new branch on GitHub,  
So that I can open a PR with verified fixes.

**As a developer opening a pull request,**  
I want the GitHub bot to automatically scan my code,  
So that I get immediate feedback on whether my changes introduce exploitable vulnerabilities.

**As a developer reviewing bot findings,**  
I want to confirm the suggested fix,  
So that the bot creates a PR with patches I can review and merge.

**As a DevOps engineer,**  
I want to integrate CodeProbe into our CI/CD pipeline,  
So that vulnerable code is blocked before deployment.

**As a technical founder,**  
I want a visual dashboard showing confirmed vs theoretical risks,  
So that I can communicate security posture to non-technical stakeholders.

**As a security researcher,**  
I want to use CodeProbe via MCP from Claude Desktop,  
So that I can integrate vulnerability scanning into my AI-assisted workflow.

---

## 5. Functional Requirements

### Core Engine: Vulnerability Scanner

**Req 5.1: Repository Input**  
The system must accept public GitHub repository URLs as input. For CLI mode, it must also accept local repository paths. The system must parse dependency manifests (package.json, package-lock.json, requirements.txt, Cargo.toml) to extract dependency versions.

**Req 5.2: CVE Database Scraping**  
The system must use Bright Data to scrape live CVE data from NVD, Exploit-DB, GitHub Security Advisories, and Snyk Vulnerability Database. Scraping must run in parallel for performance. If Bright Data is blocked or fails, the system must fall back to a cached CVE database and display a warning to the user.

**Req 5.3: Exploit Verification (Core Innovation)**  
The system must spawn isolated Daytona sandboxes, one per critical CVE. Each sandbox must:
- Install the vulnerable dependency version
- Inject a known proof-of-concept exploit script (e.g., for log4shell)
- Execute the exploit
- Capture output, network calls, and filesystem changes
- Determine if the exploit succeeded (Confirmed Exploitable) or failed (Theoretical Risk)

**Req 5.4: Patch Generation**  
The system must use Nosana-hosted LLMs (CodeBERT or StarCoder2) to generate exact code diffs that fix confirmed vulnerabilities. The LLM must analyze the vulnerable code path and produce a minimal, targeted patch. If Nosana container startup exceeds 60 seconds, the system must fall back to Claude API (Anthropic) while keeping Nosana branding in the UI.

**Req 5.5: Report Generation**  
The system must generate a detailed report containing:
- Executive summary: Confirmed exploitable count, total theoretical count, overall risk score, business impact estimate ($)
- Per-CVE breakdown: CVE ID, severity, CVSS score, affected package + version, exploit status (Confirmed/Theoretical), proof-of-concept evidence (sandbox logs, output capture)
- Patch details: Exact code diff, upgrade version (if available), breaking change warnings
- Remediation timeline estimate
- Supply chain attack warnings (if any reported in the wild for scanned dependencies)

**Req 5.6: Supply Chain Attack Detection**  
The dashboard must warn on any supply chain attacks reported for scanned dependencies (e.g., compromised maintainer, malicious version published).

### Interface 1: CLI Tool

**Req 5.7: CLI Commands**  
The CLI must support:
- `codeprobe init` - Connect GitHub account via OAuth
- `codeprobe scan` - Scan current directory, output report to terminal
- `codeprobe scan --fix` - Scan, generate patches, commit to new branch, push to GitHub
- `codeprobe scan <repo-url>` - Scan a public repo without cloning
- `codeprobe apply <cve-id>` - Apply a specific patch from previous scan
- `codeprobe report` - Display last scan results in formatted terminal output

**Req 5.8: CLI Output Format**  
The CLI must display a color-coded table showing:
- Green rows: Confirmed Exploitable (with PoC evidence)
- Yellow rows: Theoretical Risk (no PoC available or exploit failed)
- Red rows: Supply Chain Attack Warning

**Req 5.9: Commit Messages**  
When auto-fixing via `--fix`, the CLI must create commits with format:  
`[CodeProbe] Fix CVE-2021-44228 (log4shell) in package.json`  
Body must include: CVE description, severity, exploit verification status, link to full report.

### Interface 2: GitHub Bot

**Req 5.10: Bot Trigger**  
The bot must run automatically on every pull request opened against the main branch. The bot must comment on the PR within 2 minutes with initial scan results. The bot must update the comment when the scan completes.

**Req 5.11: Bot Permissions**  
The bot must have read access to the repository. The bot must open pull requests with patches but must not push directly to protected branches. Users must manually merge the bot's PR.

**Req 5.12: Bot Comment Format**  
The bot comment must show:
- Scan status (running, complete, failed)
- Summary: "Found X confirmed exploitable, Y theoretical"
- List of CVEs with severity badges
- Link to full dashboard
- "Auto-fix available" button if patches can be generated

**Req 5.13: Auto-Fix PR**  
When a user clicks "Auto-fix available", the bot must:
- Generate patches for confirmed exploitable CVEs
- Create a new branch (e.g., `codeprobe-fix-pr-123`)
- Commit patches with proper commit messages
- Open a new PR linking back to the original
- Request review from the original PR author

### Interface 3: CI/CD Integration

**Req 5.14: GitHub Action**  
The system must provide a GitHub Action that can be added to `.github/workflows/`. The action must accept inputs: `fail-on-confirmed-exploitable` (boolean), `fail-on-theoretical` (boolean), `report-format` (json/markdown/sarif).

**Req 5.15: Exit Codes**  
The action must exit with code 0 (success), 1 (vulnerabilities found), or 2 (scan failed). Exit codes must be configurable based on user policy.

**Req 5.16: SARIF Output**  
The action must support SARIF format for integration with GitHub Code Scanning. Results must include exploit verification status in the SARIF properties.

### Interface 4: MCP Server

**Req 5.17: MCP Tools**  
The system must expose MCP tools:
- `scan_repository(repo_url)` - Returns scan ID
- `get_scan_status(scan_id)` - Returns current status
- `get_scan_results(scan_id)` - Returns full report
- `apply_fix(scan_id, cve_id)` - Applies patch to repo (requires auth)

**Req 5.18: MCP Resources**  
The system must expose MCP resources for cached CVE data and exploit PoC scripts.

### Dashboard

**Req 5.19: Dashboard Views**  
The dashboard must support two views:
- Technical view (default): Full CVE details, sandbox logs, code diffs, severity scores
- Executive view: Business impact estimate, risk score gauge, count of confirmed vs theoretical, supply chain warnings

**Req 5.20: Business Impact Translation**  
The executive view must translate "confirmed exploitable" into business terms: "1 critical RCE vulnerability found. If exploited: attacker can run code on your server → data breach → $4.9M average cost."

---

## 6. Non-Functional Requirements

**Performance:**  
- CLI scan must complete in under 3 minutes for a typical Node.js project (50 dependencies)  
- CVE scraping must run in parallel (target: 10 sources in 30 seconds)  
- Sandbox verification must run 3 CVEs in parallel (target: 90 seconds for 3 critical CVEs)  
- Dashboard must load in under 2 seconds  
- GitHub bot must post initial comment within 2 minutes of PR open

**Security:**  
- All exploit code must run in isolated Daytona sandboxes with no network access to host  
- User code must never be sent to third-party APIs (Nosana runs models locally)  
- Bright Data scraping must use residential proxies to avoid rate limiting  
- OAuth tokens must be stored encrypted at rest  
- Patch generation must not introduce new vulnerabilities (LLM output must be validated)

**Reliability:**  
- System must gracefully degrade if Bright Data fails (use cached CVE data)  
- System must gracefully degrade if Nosana fails (fall back to Claude API)  
- System must handle Daytona sandbox crashes (retry with fresh sandbox)  
- System must handle partial scan failures (continue scanning remaining CVEs, report partial results)

**Scalability:**  
- Architecture must support horizontal scaling (multiple Daytona sandboxes, parallel CVE scraping)  
- Dashboard must support 100+ concurrent users  
- MCP server must handle 50+ concurrent tool calls

**Usability:**  
- CLI output must be readable in standard terminal (80 columns)  
- Dashboard must be responsive (mobile, tablet, desktop)  
- Error messages must be actionable (e.g., "Bright Data API key invalid. Set BRIGHT_DATA_API_KEY in ~/.codeprobe/config")

**Compatibility:**  
- CLI must work on macOS, Linux, and Windows (WSL)  
- GitHub bot must work with GitHub.com and GitHub Enterprise  
- MCP server must work with Claude Desktop and other MCP clients

---

## 7. UX/UI Design

### CLI Interface

```
$ codeprobe scan https://github.com/user/repo

⚡ CodeProbe v1.0.0
Scanning repository... https://github.com/user/repo

[12:34:56] Bright Data: Scraping CVE databases (NVD, Exploit-DB, Snyk)...
[12:35:14] Found 14 vulnerabilities across 8 dependencies

[12:35:15] Daytona: Spinning up 3 isolated sandboxes for CRITICAL CVEs...
[12:35:15]   ├─ Sandbox 1: CVE-2021-44228 (log4shell)
[12:35:15]   ├─ Sandbox 2: CVE-2022-22965 (Spring4Shell)
[12:35:15]   └─ Sandbox 3: CVE-2023-44487 (HTTP/2 Rapid Reset)

[12:36:45] Exploit verification complete:
  ✓ CVE-2021-44228: CONFIRMED EXPLOITABLE (RCE achieved in 3.2s)
  ✗ CVE-2022-22965: THEORETICAL (PoC failed - vulnerable code path not reachable)
  ✓ CVE-2023-44487: CONFIRMED EXPLOITABLE (DoS achieved in 1.8s)

[12:36:50] Nosana: Generating patches for confirmed vulnerabilities...
[12:37:20] Patches generated

────────────────────────────────────────────────────────────
SCAN COMPLETE

Risk Score: 9.2/10 (CRITICAL)
Confirmed Exploitable: 2
Theoretical Risk: 12
Supply Chain Warnings: 0

Business Impact Estimate: $9.8M potential breach cost

View full report: https://codeprobe.dev/r/scan_abc123
────────────────────────────────────────────────────────────
```

### GitHub Bot Comment

```markdown
## ⚡ CodeProbe Security Scan

**Status:** ✅ Complete  
**Risk Score:** 9.2/10 (CRITICAL)  
**Scan Duration:** 2m 34s

### Summary
- **2** Confirmed Exploitable (PoC verified in sandbox)
- **12** Theoretical Risk (CVE exists, exploit not verified)
- **0** Supply Chain Warnings

### Critical Findings

| CVE | Severity | Package | Status |
|-----|----------|---------|--------|
| [CVE-2021-44228](link) | CRITICAL | log4j@2.14.1 | ✅ Confirmed Exploitable |
| [CVE-2023-44487](link) | HIGH | http2-server@1.0.0 | ✅ Confirmed Exploitable |

### Business Impact
If exploited, these vulnerabilities could lead to:
- Remote code execution on your server
- Data breach ($4.9M average cost)
- Complete system compromise

### Recommended Actions
- [🔧 Auto-fix available](link) - Generate patches and open PR
- [📊 View full report](link) - Detailed analysis
- [📖 Learn more](link) - About these CVEs
```

### Dashboard Layout

**Header:**  
- CodeProbe logo + scan ID
- Risk score gauge (0-10)
- Action buttons: Export Report, Share, Re-scan

**Left Sidebar:**  
- Executive Summary (default)
- Technical Details
- Patch Diff
- Sandbox Logs
- Supply Chain Monitor

**Main Content:**  
- CVE cards grouped by severity
- Each card shows: CVE ID, package, exploit status, expandable details
- Code diff viewer for patches
- "Business Impact" callout box for non-technical viewers

**Footer:**  
- Last updated timestamp
- Powered by Daytona | Bright Data | Nosana

---

## 8. Edge Cases

**8.1: Bright Data Scraping Fails**  
System must display warning: "⚠️ Using cached CVE data (last updated: 2 hours ago). Live scraping unavailable." Scan continues with cached data. Dashboard shows a "data freshness" indicator.

**8.2: Daytona Sandbox Crashes**  
System must retry with a fresh sandbox (max 2 retries). If still fails, system must mark that CVE as "Verification Failed" and continue scanning others. User sees: "⚠️ Could not verify CVE-2021-44228 (sandbox crashed). Manual verification recommended."

**8.3: Nosana Container Startup Timeout**  
If Nosana GPU provisioning exceeds 60 seconds, system must automatically fall back to Claude API (Anthropic). UI must still show "Powered by Nosana" branding. A subtle indicator shows "Using Claude API fallback (Nosana unavailable)".

**8.4: No Exploitable CVEs Found**  
System must display: "✅ Good news! No exploitable vulnerabilities found. 14 theoretical CVEs detected, but all exploit attempts failed in isolated sandboxes. Your code is safe from known exploits." (Not an error case—positive outcome.)

**8.5: Malicious Package Detected**  
If a scanned dependency has known supply chain attack indicators (e.g., compromised maintainer, known typosquatting), system must display a RED banner: "🚨 SUPPLY CHAIN WARNING: package@1.2.3 was compromised on 2024-03-15. Remove immediately."

**8.6: Repository Too Large**  
If a repository has 500+ dependencies, system must warn: "⚠️ Large repository detected (523 dependencies). Scan will focus on CRITICAL severity CVEs first. Estimated time: 8 minutes."

**8.7: Network Connectivity Lost**  
CLI must cache scan results locally. When connectivity restored, results can be uploaded to dashboard. System must display: "📡 Offline mode. Results saved to ~/.codeprobe/last-scan.json"

**8.8: Invalid GitHub Token**  
CLI must display clear error: "❌ GitHub authentication failed. Run `codeprobe logout` then `codeprobe init` to re-authenticate."

**8.9: Conflicting Patches**  
If auto-fixing multiple CVEs creates merge conflicts, system must create separate commits per CVE and open individual PRs. User sees: "⚠️ 3 patches opened as separate PRs due to conflicts. Review each individually."

**8.10: LLM Generates Invalid Patch**  
If Nosana/Claude generates a patch that doesn't compile, system must retry generation with different prompt (max 2 retries). If still fails, system must mark patch as "manual review required" and provide CVE details for human fix.

---

## 9. Analytics & Success Metrics

**Hackathon Judging Criteria (Primary):**  
- Completeness (working MVP): Pass/Fail binary
- Innovation (live exploit verification): 1-10 scale
- Real-Life Problem Solving ($4.9M breach cost, 60% of breaches): 1-10 scale
- Sponsored Product Usage (Daytona, Bright Data, Nosana deep integration): 1-10 scale

**Technical Performance Metrics:**  
- Time to scan a typical Node.js project: Target < 3 minutes
- CVE scraping success rate: Target > 95%
- Sandbox verification success rate: Target > 90%
- Patch generation success rate: Target > 80% (80% of generated patches compile and fix the vulnerability)

**Demo Success Metrics:**  
- Demo runs without errors: Target 100%
- All three interfaces (CLI, GitHub bot, CI/CD) demonstrated: Target 100%
- Live exploit verification shown in real-time: Target 100%
- Business impact message delivered clearly: Target 100%

**User Experience Metrics (Post-Hackathon):**  
- CLI install time: Target < 30 seconds
- Time from `codeprobe scan` to first result: Target < 2 minutes
- Dashboard load time: Target < 2 seconds
- GitHub bot comment latency: Target < 2 minutes from PR open

---

## 10. Technical Architecture

### System Components

**Core Engine (Bun runtime):**  
- Repository parser (extracts dependencies from manifests)
- CVE matcher (maps dependencies to known CVEs using semver)
- Exploit orchestrator (manages Daytona sandboxes)
- Patch generator (calls Nosana LLM)
- Report builder (formats output for CLI/dashboard/CI)

**Bright Data Integration:**  
- Web scraper for NVD, Exploit-DB, Snyk, GitHub Security Advisories
- Parallel scraping with residential proxies
- Caching layer for offline/fallback scenarios

**Daytona Integration:**  
- Sandbox pool manager (creates isolated containers)
- Exploit runner (executes PoC scripts in sandboxes)
- Output capture (logs, network calls, filesystem changes)
- Verification logic (determines Confirmed vs Theoretical)

**Nosana Integration:**  
- Local LLM inference (CodeBERT for security analysis, StarCoder2 for patch generation)
- GPU container orchestration
- Fallback to Claude API if Nosana unavailable

**Dashboard (React):**  
- Technical view (full CVE details, code diffs, sandbox logs)
- Executive view (business impact, risk score, warnings)
- Real-time scan progress updates

**GitHub Bot:**  
- Webhook handler for PR events
- Comment updater (posts/edits PR comments)
- PR creator (opens auto-fix PRs with patches)

**MCP Server:**  
- Tool implementations (scan, get_status, get_results, apply_fix)
- Resource providers (cached CVE data, PoC scripts)
- OAuth/auth handling

### Data Flow

```
User Input (Repo URL)
    ↓
Core Engine → Parse Dependencies
    ↓
Bright Data → Scrape CVE Databases (parallel)
    ↓
Core Engine → Match Dependencies to CVEs (semver)
    ↓
Daytona → Spawn Sandboxes for CRITICAL CVEs
    ↓
Daytona → Run PoC Exploits in Sandboxes
    ↓
Core Engine → Verify Exploit Results
    ↓
Nosana → Generate Patches for Confirmed CVEs
    ↓
Core Engine → Build Report
    ↓
Output → CLI / Dashboard / GitHub Bot / MCP
```

---

## 11. Pre-Hackathon Preparation

**P1: Demo CVE Selection**  
Pre-select log4shell (CVE-2021-44228) and HTTP/2 Rapid Reset (CVE-2023-44487) as the demo CVEs. Both are extremely well-documented with thousands of PoC scripts available. Test both against a demo Node.js app and have working exploits ready.

**P2: Demo Repository Preparation**  
Create a demo GitHub repository with intentionally vulnerable dependencies. Ensure the repository is public so the CLI can scan it without auth. Include 2-3 critical CVEs and 5-10 theoretical ones for a realistic demo.

**P3: Bright Data API Key**  
Sign up for Bright Data, get API key, test residential proxy scraping. Verify it can scrape NVD and Exploit-DB without rate limiting.

**P4: Daytona Sandbox Testing**  
Test spawning a Daytona sandbox, installing a vulnerable package, running a PoC exploit, and capturing output. Verify network isolation (sandbox cannot reach host or internet).

**P5: Nosana GPU Container**  
Test Nosana container startup time with CodeBERT or StarCoder2 model. Measure cold start time. Prepare Claude API fallback credentials.

**P6: CLI Installation**  
Build and test the CLI binary for macOS, Linux, and Windows. Verify it works on a fresh machine with just the binary + config file.

**P7: GitHub Bot Setup**  
Create a GitHub App, configure webhooks, test PR comment posting. Verify OAuth flow works.

**P8: Demo Script Rehearsal**  
Rehearse the 2-minute demo at least 5 times. Time each section. Practice the live exploit verification moment. Prepare for Q&A from judges.

---

## 12. 5-Hour Build Plan

**10:00-10:30: Kickoff + Workshop**  
Team formation, sponsor API introductions, credential provisioning.

**10:30-11:30: Architecture + Setup**  
- Initialize Bun project
- Set up Bright Data scraper (test with NVD)
- Set up Daytona sandbox (test exploit execution)
- Set up Nosana LLM (test patch generation)
- Create demo repository

**11:30-13:00: Core Engine**  
- Dependency parser (Node.js only for MVP)
- CVE matcher (exact version matching from package-lock.json)
- Sandbox orchestrator (parallel execution, 3 CVEs at a time)
- Report builder (JSON format)

**13:00-14:00: CLI Interface**  
- Implement `codeprobe scan` command
- Add `--fix` flag for auto-patching
- Format terminal output with colors and tables
- Test end-to-end on demo repo

**14:00-15:00: Dashboard**  
- React app with Technical and Executive views
- Real-time scan progress (WebSocket or polling)
- Code diff viewer for patches
- Business impact calculator

**15:00-16:00: GitHub Bot + MCP**  
- GitHub App webhook handler
- PR comment posting
- Auto-fix PR creation
- MCP server with scan/get_status/apply_fix tools

**16:00-16:30: Polish + Rehearsal**  
- Fix bugs from integration testing
- Polish dashboard UI
- Rehearse demo (3-5 times)
- Prepare backup plans for failure modes

**16:30: Submit**

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bright Data scraping blocked | High | Use cached CVE database as fallback, display warning |
| Daytona sandbox crash | High | Retry with fresh sandbox (max 2 retries), mark CVE as "Verification Failed" |
| Nosana GPU cold start > 60s | Medium | Auto-fallback to Claude API, keep Nosana branding in UI |
| Demo CVE not exploitable in our test repo | Critical | Pre-test log4shell + HTTP/2 Rapid Reset before hackathon, have backup CVEs ready |
| GitHub bot OAuth issues | Medium | Test auth flow pre-hackathon, have manual token fallback |
| Patch generation produces invalid code | Medium | Validate patches compile, retry with different prompt, mark as "manual review" |
| Scope creep | High | Strict V0 definition: Node.js only, 2 demo CVEs, 3 interfaces (CLI/GitHub/CI), MCP stretch |
| Non-technical judge confusion | Medium | Add "Business Impact" screen with $4.9M breach cost framing |
| Network issues during demo | High | Pre-record video of working demo as backup, have offline mode in CLI |
| Time overrun | High | Cut MCP if needed, cut CI/CD integration if needed, prioritize CLI + GitHub bot |

---

## 14. Success Criteria

**Must Have (Demo Will Not Work Without):**  
- Working CLI that scans a public GitHub repo
- Live Bright Data CVE scraping
- Daytona sandbox spawning and exploit execution
- Nosana LLM patch generation
- Detailed report output
- At least 2 confirmed exploitable CVEs in demo

**Should Have (Strong Demo):**  
- GitHub bot with auto-fix PR creation
- Dashboard with Technical + Executive views
- Business impact translation
- Supply chain attack warnings

**Nice to Have (Impressive Demo):**  
- CI/CD GitHub Action
- MCP server
- SARIF output support
- Offline mode with cached results

---

## 15. Open Questions

None at this time. All decisions made based on hackathon constraints and judging criteria.

---

## 16. Post-Hackathon (If Idea Proceeds)

**Note:** This is a stretch section. Only relevant if the team decides to continue development after the hackathon. Not part of the hackathon scope.

**Potential Next Steps:**  
- Multi-language support (Python, Rust, Java)
- Enterprise SSO integration
- Self-hosted deployment option
- Custom PoC upload for private exploits
- Slack/Teams notifications
- Jira/Linear integration for vulnerability tracking
- Historical scan tracking and trends
- Team collaboration features (assign vulnerabilities, comment threads)
- Custom security policies (fail build if > 5 critical CVEs)
- White-label offering for security consultancies
- Enterprise pricing tiers (based on repos, users, scan frequency)

---

## 17. Business Model (For Presentation)

**Pricing Model:** Enterprise license  
**Contact:** "Contact us for pricing details"  
**Target Market:** Mid-size to large companies with 10+ developers, security-conscious industries (fintech, healthcare, SaaS)  
**Value Proposition:** Reduce breach risk ($4.9M average cost) by confirming exploitability before patches are prioritized. Ship code 10x faster with clear security signals.  
**Sales Motion:** Direct sales to CTOs and DevOps leads, land-and-expand from single team to org-wide deployment.

---

## 18. Appendix

**A. Demo Repository Structure**  
```
demo-vulnerable-app/
├── package.json (intentionally vulnerable dependencies)
├── package-lock.json
├── README.md (explains demo purpose)
├── src/
│   ├── server.js (uses vulnerable packages)
│   └── routes/
└── .github/
    └── workflows/
        └── codeprobe.yml
```

**B. Demo CVEs**  
- CVE-2021-44228 (log4shell) - CRITICAL, RCE, 10.0 CVSS
- CVE-2023-44487 (HTTP/2 Rapid Reset) - HIGH, DoS, 7.5 CVSS
- CVE-2022-22965 (Spring4Shell) - CRITICAL, RCE, 9.8 CVSS (backup)

**C. Bright Data Scraping Targets**  
- NVD: https://nvd.nist.gov/vuln/detail/{CVE-ID}
- Exploit-DB: https://www.exploit-db.com/exploits/{ID}
- Snyk: https://security.snyk.io/vuln/{CVE-ID}
- GitHub Security Advisories: https://github.com/advisories/{GHSA-ID}

**D. Nosana Models**  
- CodeBERT: For security analysis and vulnerability classification
- StarCoder2 33B: For patch generation and code fixes
- DeepSeek-Coder: Alternative for code generation

**E. Daytona Sandbox Configuration**  
- Base image: Node.js 20
- Network: Isolated (no host access)
- Resources: 1 CPU, 512MB RAM, 5GB disk
- Timeout: 60 seconds per exploit
- Cleanup: Automatic after scan completes

**F. References**  
- Verizon DBIR 2026: https://www.verizon.com/business/resources/reports/dbir/
- IBM Cost of Breach 2026: https://www.ibm.com/security/data-breach
- NVD: https://nvd.nist.gov/
- Daytona Docs: https://daytona.io/docs
- Bright Data Docs: https://brightdata.com/docs
- Nosana Docs: https://docs.nosana.io

---

**End of PRD**
