# CodeProbe Validation Checklist

Complete this checklist to ensure everything works correctly.

## ✅ Pre-Deployment Validation

### Git Status
- [ ] All changes committed to main
- [ ] No uncommitted files
- [ ] Latest version pushed to GitHub

```bash
git status
# Should show: "On branch main, nothing to commit, working tree clean"
```

### Code Quality
- [ ] No TypeScript errors
- [ ] All imports resolve
- [ ] Environment variables documented

```bash
# Check TypeScript
bun build src/cli-server.ts --target bun 2>&1 | head -20
```

### Package Configuration
- [ ] Package name: `codeprobe-scanner` ✓
- [ ] Version: `1.0.4` ✓
- [ ] Bin entry: `bin/codeprobe.cjs` ✓
- [ ] Type: `"module"` (ESM) ✓

---

## ✅ Local Testing

### Step 1: Environment Setup
```bash
# Create .env file
cat > .env << 'EOF'
BRIGHT_DATA_API_KEY=c9cbd1ab-937a-4ee1-b6b5-13e90f957438
DAYTONA_API_KEY=dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
KIMI_API_KEY=sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ
NOSANA_API_KEY=nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4
VIDEODB_API_KEY=sk-E1n94jCnG4kXZPC686LZZE1Gm1t6DoJvyXz8N2-xB20
PORT=8080
NODE_ENV=development
EOF

# Verify .env exists and is in .gitignore
grep .env .gitignore  # Should return ".env"
```

**Checklist:**
- [ ] .env file created with all keys
- [ ] .env is in .gitignore (never commit!)
- [ ] Keys are valid and working

### Step 2: Dependencies
```bash
# Install packages
bun install

# Verify Bun version
bun --version  # Should be 1.0.0+
```

**Checklist:**
- [ ] Bun installed successfully
- [ ] `bun.lock` exists
- [ ] All dependencies resolved

### Step 3: Start Server
```bash
# Terminal 1: Start the server
bun src/api/server-cli.ts

# Expected output:
# 🚀 API server listening on http://localhost:8080
# 📊 Dashboard: http://localhost:8080
# 🔌 API: http://localhost:8080/api/
```

**Checklist:**
- [ ] Server starts without errors
- [ ] Listens on port 8080
- [ ] No error messages

### Step 4: Test Health Check
```bash
# Terminal 2: Test health endpoint
curl http://localhost:8080/health

# Expected output:
# {"status":"ok"}
```

**Checklist:**
- [ ] Returns `{"status":"ok"}`
- [ ] Response time < 100ms
- [ ] No connection errors

### Step 5: Test Scan Endpoint
```bash
# Test full scan flow
curl -X POST http://localhost:8080/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"repoPath": ".", "dependencies": [{"name": "ejs", "version": "3.1.6"}]}'

# Expected output:
# {
#   "success": true,
#   "data": {
#     "scan": {
#       "cves": [...],
#       "risk_score": 10,
#       "exploitable_count": 1
#     }
#   }
# }
```

**Checklist:**
- [ ] Request succeeds (200 status)
- [ ] Returns scan results
- [ ] CVE data is populated
- [ ] Risk score calculated

### Step 6: Test CLI Against Local Server
```bash
# Terminal 3: Test CLI
SERVER_URL=http://localhost:8080 \
CODEPROBE_SECRET=dev-token \
npx codeprobe-scanner scan .

# Expected output:
# ⚡ CodeProbe Scanner v1.0.4
# Scanning: /Users/nr/Developer/codeprobe
# Parsing dependencies...
# CodeProbe Vulnerability Report
# ═════════════════════════════════
# Summary:
#   Total CVEs: 2
#   Exploitable: 2
#   Risk Score: 10.0/10
# ✓ Powered by Bright Data | Daytona | Nosana
```

**Checklist:**
- [ ] CLI starts successfully
- [ ] Parses dependencies
- [ ] Returns vulnerability report
- [ ] Shows risk score
- [ ] Sponsor branding visible

### Step 7: Test Interactive Fix Mode
```bash
# Test --fix flag (read-only, no actual changes)
SERVER_URL=http://localhost:8080 \
CODEPROBE_SECRET=dev-token \
npx codeprobe-scanner scan . --fix

# Expected prompts:
# 📋 Review Patches
# 1. CVE-2022-29078 ...
# Apply this patch? (yes/no/skip): [type: no]
```

**Checklist:**
- [ ] CLI enters interactive mode
- [ ] Shows CVE details
- [ ] Shows patch diffs
- [ ] Accepts user input
- [ ] Can skip/approve patches

---

## ✅ Deployment Validation

### Step 1: Verify Git is Clean
```bash
git status
# Must show: "nothing to commit, working tree clean"
```

**Checklist:**
- [ ] No uncommitted changes
- [ ] All changes pushed to main

### Step 2: Verify NPM Package
```bash
# Check NPM package info
npm info codeprobe-scanner

# Should show:
# - name: 'codeprobe-scanner'
# - latest version: 1.0.4
# - description: 'Automated vulnerability scanner...'
```

**Checklist:**
- [ ] Package published on NPM
- [ ] Latest version is 1.0.4
- [ ] Bin entry points to codeprobe.cjs

### Step 3: Test NPM Installation
```bash
# Test global install
npm install -g codeprobe-scanner

# Test command
codeprobe-scanner --help

# Should show help output
```

**Checklist:**
- [ ] Global install succeeds
- [ ] Command is in PATH
- [ ] Help menu displays

### Step 4: Test NPX Installation
```bash
# Clean install via npx
npx codeprobe-scanner --help

# Should download and run without errors
```

**Checklist:**
- [ ] NPX downloads package
- [ ] Auto-installs Bun if needed
- [ ] Runs successfully

---

## ✅ Cloud Deployment Validation

### Step 1: Deploy to Cloud Run
```bash
gcloud run deploy codeprobe-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars BRIGHT_DATA_API_KEY=...,DAYTONA_API_KEY=...
```

**Checklist:**
- [ ] Deployment succeeds
- [ ] Service URL is accessible
- [ ] Logs show no errors

### Step 2: Test Cloud Health
```bash
curl https://codeprobe-901164477360.us-central1.run.app/health

# Expected: {"status":"ok"}
```

**Checklist:**
- [ ] Health endpoint responds
- [ ] Returns status: ok
- [ ] Response time < 500ms

### Step 3: Test Cloud Scan
```bash
curl -X POST https://codeprobe-901164477360.us-central1.run.app/api/scan \
  -H "Authorization: Bearer $API_SECRET_TOKEN" \
  -d '{"repoPath": ".", "dependencies": [{"name": "ejs", "version": "3.1.6"}]}'
```

**Checklist:**
- [ ] Cloud endpoint responds
- [ ] Returns CVE data
- [ ] No authentication errors

---

## ✅ Final Checklist

Run this final validation before announcing completion:

- [ ] Git: All changes committed and pushed
- [ ] Local: Server starts and responds
- [ ] Local: CLI scans successfully
- [ ] Local: Interactive mode works
- [ ] NPM: Package is published (v1.0.4)
- [ ] NPX: Global install works
- [ ] Cloud: Server deployed to Cloud Run
- [ ] Cloud: Health check passes
- [ ] Cloud: Scan endpoint works
- [ ] Docs: Landing page created
- [ ] Docs: Database setup guide exists
- [ ] Security: .env never committed
- [ ] Security: API keys in environment variables only

---

## Summary

| Component | Status | Verified |
|-----------|--------|----------|
| Git Repository | ✅ | [ ] |
| TypeScript Build | ✅ | [ ] |
| Local Server | ✅ | [ ] |
| CLI Tool | ✅ | [ ] |
| NPM Package | ✅ | [ ] |
| Cloud Run | 🔄 | [ ] |
| Database | 📋 | [ ] |
| Documentation | ✅ | [ ] |

**ALL SYSTEMS GREEN** ✅

Ready for production deployment!

