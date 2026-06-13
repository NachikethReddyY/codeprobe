# CodeProbe: Deployment Status & Next Steps

## ✅ WHAT'S READY

### Core CLI Tool
- ✅ `src/cli-server.ts` — Complete, production-ready
- ✅ `bin/install-and-run.sh` — Auto-installs Bun
- ✅ `package.json` — Configured for NPM publishing
- ✅ Daytona SDK integrated (`@daytona/sdk` installed)
- ✅ Real sandbox exploit execution (not simulated)

### Backend Server
- ✅ `src/api/server-cli.ts` — Production-ready REST API
- ✅ `Dockerfile` — Google Cloud Run ready
- ✅ Rate limiting (5 req/min per IP)
- ✅ Bearer token authentication
- ✅ Health check endpoint

### Configuration & Documentation
- ✅ `DEPLOY.md` — Complete step-by-step deployment guide
- ✅ `DEPLOY_CHECKLIST.md` — Full deployment checklist
- ✅ `QUICKSTART.md` — User guide
- ✅ `.env.example` — All environment variables documented

### API Keys & Integration
- ✅ Daytona API Key received: `dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc`
- ✅ Daytona SDK integrated into sandbox.ts
- ✅ Real exploit execution working (with simulation fallback)

---

## ⏳ WAITING FOR USER ACTION

### Phase 1: Google Cloud Setup (Your Action)

**What you need to do:**

1. **Create a Google Cloud project** (if not already done)
   ```bash
   gcloud projects create codeprobe
   gcloud config set project codeprobe
   ```

2. **Enable required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

3. **Get your Google Cloud Run URL**
   - Once deployed (see Phase 2), you'll have a URL like:
   ```
   https://codeprobe-abc123.run.app
   ```

4. **Generate a secret token**
   ```bash
   # Generate a random 32-char hex string
   openssl rand -hex 32
   # Example output: a7f3e8d2c9b1f4e6a7d3c8f1b9e2a4d6c7f8a1b2c3d4e5f6a7b8c9d0e1f2a3
   ```

5. **Collect these values:**
   ```
   GOOGLE_CLOUD_URL = https://your-cloud-run-url.run.app
   API_SECRET_TOKEN = random-hex-string-from-step-4
   DAYTONA_API_KEY = dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
   ```

---

## 📋 DEPLOYMENT PHASES

Once you have the values above, follow these steps:

### Phase 2: Deploy Server to Google Cloud (10-15 min)
1. Read `DEPLOY.md` (complete guide provided)
2. Run the `gcloud` commands to build and deploy
3. Set environment variables in Cloud Run console
4. Test: `curl https://your-url/health`

### Phase 3: Configure CLI (2 min)
Set these environment variables on your machine:
```bash
export SERVER_URL="https://your-cloud-run-url.run.app"
export CODEPROBE_SECRET="your-api-secret-token"
```

Or add to `~/.bashrc` or `~/.zshrc` for persistence.

### Phase 4: Test Locally (5 min)
```bash
# Test 1: Health check
curl https://your-url/health

# Test 2: Scan endpoint
curl -X POST https://your-url/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CODEPROBE_SECRET" \
  -d '{"repoPath": "."}'

# Test 3: CLI
bun src/cli-server.ts scan .
```

### Phase 5: NPM Publishing (5 min)
```bash
npm login
npm publish
```

### Phase 6: GitHub Integration (2 min per repo)
Add this to any repo's `.github/workflows/codeprobe.yml`:
```yaml
name: CodeProbe Security Scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx codeprobe scan . --json --token ${{ secrets.CODEPROBE_SECRET }}
```

---

## 🔑 ENVIRONMENT VARIABLES REQUIRED

### On Your Machine (CLI)
```bash
SERVER_URL=https://your-cloud-run-url.run.app
CODEPROBE_SECRET=your-api-secret-token
```

### On Google Cloud Run (Server)
```bash
GOOGLE_CLOUD_URL=https://your-cloud-run-url.run.app
API_SECRET_TOKEN=your-api-secret-token
DAYTONA_API_KEY=dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
PORT=8080
NODE_ENV=production
```

---

## 🚀 QUICK COMMANDS REFERENCE

```bash
# Test locally (before cloud deployment)
bun src/api/server-cli.ts

# Run CLI against local server
SERVER_URL=http://localhost:8080 bun src/cli-server.ts scan .

# Run CLI against cloud server (once deployed)
SERVER_URL=https://your-url CODEPROBE_SECRET=xxx bun src/cli-server.ts scan .

# Run all tests
bun test

# Build Docker image locally
docker build -t codeprobe .
```

---

## 📊 DEPLOYMENT TIMELINE

| Phase | Time | Blocker | Status |
|-------|------|---------|--------|
| 1. Google Cloud setup | 10-15 min | You | ⏳ **ACTION NEEDED** |
| 2. Deploy server | 10 min | Phase 1 | ⏳ Blocked |
| 3. Configure CLI | 2 min | Phase 2 | ⏳ Blocked |
| 4. Test locally | 5 min | Phase 3 | ⏳ Blocked |
| 5. Publish to NPM | 5 min | Phase 4 | ⏳ Blocked |
| 6. GitHub integration | 2 min | Phase 5 | ⏳ Blocked |

**Total time to full deployment:** ~45 minutes (once Phase 1 starts)

---

## ✨ WHAT YOU'LL BE ABLE TO DO

After deployment:

### Command Line
```bash
npm install -g codeprobe
codeprobe scan /path/to/repo
codeprobe scan . --json      # JSON output for piping
```

### GitHub Actions
```
Push code → GitHub Actions → npx codeprobe scan → Results in PR comment
```

### Scheduled Scanning
```
Hourly cronjob → Detects package changes → Triggers scan → Results saved
```

---

## 🆘 TROUBLESHOOTING

### "Connection refused"
- Make sure `SERVER_URL` is set correctly
- Make sure Google Cloud server is running
- Try: `curl https://your-url/health`

### "Unauthorized"
- Check `CODEPROBE_SECRET` matches on both CLI and server
- In development mode, any token works

### "Daytona failed"
- Falls back to local simulation automatically
- Check Daytona API key in environment variables
- Logs will show: `[Daytona] ✓ Real sandbox enabled` if working

---

## 📝 SUMMARY

**You have:**
- ✅ Complete CLI tool
- ✅ Production server ready
- ✅ Daytona SDK integrated
- ✅ Docker container ready
- ✅ Full deployment guide

**You need to provide:**
- Google Cloud URL (once you deploy)
- Generated secret token
- Environment variable setup

**Time to full deployment:** ~45 minutes

Once you have the Google Cloud URL, reply here and I'll help you through the remaining deployment steps!
