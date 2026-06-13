# CodeProbe Interactive Fix Flow

## Overview

The `--fix` mode enables an **interactive vulnerability patching workflow** that:
1. **Scans** the repository for vulnerabilities
2. **Reviews** patches with the user before applying
3. **Applies** patches to local files
4. **Commits** changes with meaningful messages
5. **Pushes** to a new branch
6. **Creates** a pull request automatically

## Complete Flow

```
User: codeprobe scan . --fix
                ↓
[1] SCAN PHASE
    - Parse package.json locally
    - POST dependencies to server
    - Server runs full scan:
      * Scrapes CVEs (Bright Data)
      * Tests exploits (Daytona sandbox)
      * Generates patches (Kimi/Nosana LLM)
    - Returns scan results with patch_diff
                ↓
[2] INTERACTIVE REVIEW
    For each CVE with a patch available:
    - Show CVE details (CVSS, description)
    - Show the unified diff
    - Prompt: "Apply this patch? (yes/no/skip/view-details)"
    
    User can:
    - "yes/y" → Mark for patching
    - "no/n" → Skip this CVE
    - "skip/s" → Skip this CVE
    - Other → Show more details
                ↓
[3] FINAL APPROVAL
    Show summary:
    - "Will apply X patches"
    - Prompt: "Proceed with patches? (yes/no)"
                ↓
[4] APPLY PATCHES
    If user approves:
    - Create new branch: codeprobe-security-fixes-{timestamp}
    - Modify package.json with fixed versions
    - Run: npm install / bun install (optional)
                ↓
[5] COMMIT
    - git add package.json
    - git commit -m "security: patch N vulnerabilities via codeprobe"
    - Show: "✓ Committed with message..."
                ↓
[6] PUSH
    - git push -u origin codeprobe-security-fixes-{timestamp}
    - Show: "✓ Pushed to origin/codeprobe-security-fixes-{timestamp}"
                ↓
[7] CREATE PR
    - gh pr create --title "Security: Patch N vulnerabilities"
    - Includes CVE list, risk score, exploitable count
    - Show: "✓ PR created! Opening in browser..."
    - Show PR URL
                ↓
    Done! User reviews PR, tests, and merges if approved
```

## API Flow (Server-Side)

```
POST /api/scan
├─ Parse dependencies from package.json
├─ [Bright Data] Scrape CVE databases
│  └─ Bearer token: c9cbd1ab-937a-4ee1-b6b5-13e90f957438
├─ [Daytona] Run exploits in sandbox
│  └─ API key: dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
├─ [Kimi LLM] Generate patches
│  ├─ Prompt engineer the CVE → patch
│  ├─ API: https://api.aimlapi.com/v1/chat/completions
│  ├─ Model: moonshot/kimi-k2-5
│  └─ API key: sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ
├─ [Nosana] Fallback patch generation
│  ├─ GPU inference job for patch generation
│  ├─ API: https://api.nosana.com/v1/jobs
│  └─ API key: nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4
└─ Return Report with patch_diff populated
```

## CLI Flow (Client-Side)

```
codeprobe scan . --fix
├─ Parse scan args (path, --fix, --json, etc.)
├─ Parse dependencies locally (package.json)
├─ POST to SERVER_URL/api/scan
├─ [INTERACTIVE] reviewAndApplyPatches()
│  ├─ For each CVE with patch_diff:
│  │  ├─ Show details (CVSS, description)
│  │  ├─ Show unified diff
│  │  ├─ promptUser("Apply this patch?")
│  │  └─ Mark if approved
│  ├─ Show summary
│  ├─ promptUser("Proceed with patches?")
│  └─ Return approved = true/false
├─ [GIT] applyPatchesAndCreatePR()
│  ├─ git checkout -b codeprobe-security-fixes-{timestamp}
│  ├─ Modify package.json (update versions)
│  ├─ git add package.json
│  ├─ git commit -m "security: patch N vulnerabilities via codeprobe"
│  ├─ git push -u origin {branchName}
│  ├─ gh pr create --title "..." --body "..."
│  └─ Show PR URL
└─ Exit with code 0 (success)
```

## Example Session

```bash
$ codeprobe scan /path/to/app --fix

⚡ CodeProbe Scanner v1.0.0
Scanning: /path/to/app
Parsing dependencies...
Sending to server...

📋 Review Patches

1. CVE-2022-29078 (ejs@3.1.6 → 3.1.7)
   Severity: CRITICAL | CVSS: 9.8
   EJS before 3.1.7 allows template injection attacks with arbitrary code execution

Proposed changes:
--- a/package.json
+++ b/package.json
@@ -5,1 +5,1 @@
-  "ejs": "3.1.6"
+  "ejs": "3.1.7"

Apply this patch? (yes/no/skip/view-details): yes
✓ Marked for patching: CVE-2022-29078

📦 Summary
Will apply 1 patch(es)

Proceed with patches? (yes/no): yes

🔧 Applying Patches

Creating branch: codeprobe-security-fixes-1718365539291
Updating package.json...
✓ Updated ejs to ^3.1.7
Committing changes...
✓ Committed with message: "security: patch 1 vulnerability via codeprobe"
Pushing to remote...
✓ Pushed to origin/codeprobe-security-fixes-1718365539291
Creating pull request...
✓ PR created! Opening in browser...
https://github.com/user/repo/pull/42

✨ Done! Your security patches are ready for review.
```

## Normal Scan Mode (Without --fix)

For CI/CD and non-interactive use:

```bash
$ codeprobe scan /path/to/app

⚡ CodeProbe Scanner v1.0.0
Scanning: /path/to/app

CodeProbe Vulnerability Report
════════════════════════════════════

Summary:
  Total CVEs: 2
  Exploitable: 1
  Theoretical: 1
  Risk Score: 9.5/10

Vulnerabilities:
─────────────────

  CVE-2022-29078 CRITICAL
    Package: ejs@3.1.6
    CVSS: 9.8/10
    Status: EXPLOITABLE
    Fixed in: 3.1.7

✓ Powered by Bright Data | Daytona | Nosana

$ echo $?
1  # Exit code 1 = vulnerabilities found
```

## Environment Variables Required

### On Local Machine
```bash
# Server configuration
SERVER_URL=http://localhost:8080  # or your cloud URL
CODEPROBE_SECRET=random-secret    # Shared secret with server

# Optional: for GitHub PR creation
export GH_TOKEN=github_token_here  # Set via `gh auth login` instead
```

### On Server
```bash
# Sponsor APIs (in .env)
BRIGHT_DATA_API_KEY=c9cbd1ab-937a-4ee1-b6b5-13e90f957438
DAYTONA_API_KEY=dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
NOSANA_API_KEY=nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4
KIMI_API_KEY=sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ

# Server configuration
PORT=8080
NODE_ENV=development
```

## Key Features

✅ **Real Patch Generation**
- Kimi K2.5 LLM with long context windows
- Nosana GPU inference as fallback
- Pre-baked patches for known CVEs

✅ **Real Exploit Verification**
- Daytona sandboxes for RCE testing
- Automatic fallback to simulation

✅ **Real CVE Data**
- Bright Data scraping with authentication
- NVD fallback if scraper fails
- Caching to ~/.codeprobe/cache.json

✅ **Interactive User Experience**
- Review each patch before applying
- Skip patches you don't want
- Get detailed information on demand

✅ **Git & GitHub Integration**
- Automatic branch creation
- Meaningful commit messages
- GitHub CLI support for PR creation

✅ **CI/CD Compatible**
- Use `--json` flag for structured output
- Use without `--fix` for read-only scanning
- Exit codes for automation

## Testing Locally

```bash
# Terminal 1: Start the server
export NODE_ENV=development
bun src/api/server-cli.ts

# Terminal 2: Test scan (no fix)
export SERVER_URL=http://localhost:8080
export CODEPROBE_SECRET=dev-token
bun src/cli-server.ts scan ./demo-vulnerable-app

# Terminal 3: Test --fix mode (interactive)
export SERVER_URL=http://localhost:8080
export CODEPROBE_SECRET=dev-token
cd /tmp/test-app
bun /Users/nr/Developer/codeprobe/src/cli-server.ts scan . --fix
# Answer prompts:
# - "yes" to apply ejs patch
# - "yes" to proceed
# - Observe branch creation, commit, push, and PR
```

## Troubleshooting

### "Connection refused"
- Make sure server is running: `bun src/api/server-cli.ts`
- Check SERVER_URL env var is correct
- Try: `curl http://localhost:8080/health`

### "Unauthorized" error
- Check CODEPROBE_SECRET matches between CLI and server
- In development mode, any token works

### "Kimi API error"
- Check KIMI_API_KEY is set correctly in .env
- Verify internet connection
- Check API key has sufficient credits

### "git push failed"
- Ensure you have Git configured: `git config user.name` and `git config user.email`
- Ensure you have push access to the repository
- Check remote is configured: `git remote -v`

### "gh pr create failed"
- Run `gh auth login` to authenticate
- Verify you have repo permissions
- Check GH_TOKEN is set if using token auth

## Next Steps

1. **Deploy Server to Google Cloud Run** (see DEPLOY.md)
2. **Publish to NPM** (see DEPLOY_CHECKLIST.md)
3. **Add to GitHub Actions** (automatic PR scanning)
4. **Configure Scheduled Scans** (hourly package change detection)

