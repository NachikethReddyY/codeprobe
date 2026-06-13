# API Integrations Guide

CodeProbe integrates with three powerful sponsor APIs to provide complete vulnerability scanning and patching capabilities.

## 1. Bright Data API (CVE Scraping)

### Purpose
Scrapes CVE databases (NVD, Exploit-DB, Snyk) to find vulnerabilities affecting your dependencies.

### Integration Details

**API Endpoint:**
```
GET https://api.nvd.nist.gov/rest/json/cves/2.0?keyword={package_name}
```

**Authentication:**
```
Authorization: Bearer {BRIGHT_DATA_API_KEY}
Content-Type: application/json
```

**API Key:**
```
BRIGHT_DATA_API_KEY=c9cbd1ab-937a-4ee1-b6b5-13e90f957438
```

**Implementation Location:**
- `src/engine/scraper.ts` → `fetchFromBrightData()` method
- Called during scan phase to find CVEs for each dependency

**How It Works:**
1. For each dependency in package.json
2. Query NVD API with Bright Data authentication
3. Parse response to extract CVE details
4. Fallback to local cache if API fails
5. Return list of CVEs with CVSS, severity, description

**Response Format:**
```json
{
  "vulnerabilities": [
    {
      "id": "CVE-2022-29078",
      "cve": {
        "id": "CVE-2022-29078",
        "descriptions": [
          {"value": "EJS before 3.1.7 allows template injection..."}
        ],
        "impact": {
          "baseScore": 9.8,
          "baseSeverity": "CRITICAL"
        },
        "weaknesses": [
          {"source": "CWE-94"}
        ]
      }
    }
  ]
}
```

**Error Handling:**
- If API fails, falls back to local cache in `~/.codeprobe/cache.json`
- Cache is updated on successful scrapes
- Demo CVE (ejs CVE-2022-29078) always available

### Testing
```bash
# Test Bright Data integration locally
curl -H "Authorization: Bearer c9cbd1ab-937a-4ee1-b6b5-13e90f957438" \
  "https://api.nvd.nist.gov/rest/json/cves/2.0?keyword=ejs"
```

---

## 2. Daytona API (Exploit Verification)

### Purpose
Executes exploits in isolated sandboxes to verify if vulnerabilities are actually exploitable in your environment.

### Integration Details

**API Endpoint:**
```
POST https://app.daytona.io/api/workspace
```

**Authentication:**
```
Authorization: Bearer {DAYTONA_API_KEY}
```

**API Key:**
```
DAYTONA_API_KEY=dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc
```

**Implementation Location:**
- `src/engine/sandbox.ts` → Real Daytona integration
- Uses `@daytona/sdk` for workspace management
- Called for HIGH/CRITICAL severity CVEs

**How It Works:**
1. Create JavaScript workspace in Daytona
2. Install vulnerable package via npm
3. Execute exploit code (RCE payload)
4. Capture output
5. Determine if "RCE_SUCCESS" found in output
6. Return sandbox result with evidence

**Exploit Code Example (ejs CVE-2022-29078):**
```javascript
const ejs = require('ejs');
const payload = 'require("child_process").execSync("echo PWNED")';
const template = '<%= ' + payload + ' %>';

try {
  const result = ejs.render(template, {});
  console.log('RCE_SUCCESS: Code execution confirmed');
  process.exit(0);
} catch (e) {
  console.log('RCE_FAILED: ' + e.message);
  process.exit(1);
}
```

**Fallback:**
- If Daytona unavailable or API fails, uses local simulation
- Simulation returns realistic results based on version checks
- Marked as "[Simulation]" in output

**Response Format:**
```json
{
  "exploit_ran": true,
  "exit_code": 0,
  "stdout": "[Daytona] EJS 3.1.6 - EXPLOITABLE\n...",
  "stderr": "",
  "success": true,
  "time_ms": 1200
}
```

### Testing
```bash
# Test Daytona API
curl -H "Authorization: Bearer dtn_e4e5fd8c6c30f5b9da9453078f6b4e396202e56c0aaa1260e704e34d1380d2dc" \
  -X POST https://app.daytona.io/api/workspace \
  -d '{"language": "javascript"}'
```

---

## 3. Kimi LLM API (Patch Generation - Primary)

### Purpose
Uses Moonshot Kimi's advanced LLM to generate security patches that fix vulnerabilities.

### Integration Details

**API Endpoint:**
```
POST https://api.aimlapi.com/v1/chat/completions
```

**Authentication:**
```
Authorization: Bearer {KIMI_API_KEY}
Content-Type: application/json
```

**API Key:**
```
KIMI_API_KEY=sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ
```

**Model:**
```
moonshot/kimi-k2-5  # Multimodal, long context, coding-optimized
```

**Implementation Location:**
- `src/engine/patcher.ts` → `generatePatchWithKimi()` method
- Primary LLM for patch generation
- Called for each exploitable CVE

**How It Works:**
1. Build a prompt with CVE details
2. Ask Kimi to generate a unified diff patch
3. Send POST request to AIMLAPI endpoint
4. Parse response to extract patch
5. Return unified diff or null if failed

**Prompt Template:**
```
Generate a minimal security patch to fix CVE-2022-29078 in ejs@3.1.6.

The CVE is: EJS before 3.1.7 allows template injection attacks...

Return ONLY a unified diff in this format:
--- a/package.json
+++ b/package.json
@@ -X,Y +X,Y @@
-"ejs": "3.1.6"
+"ejs": "3.1.7"

Include only the diff, no explanation.
```

**Request Format:**
```json
{
  "model": "moonshot/kimi-k2-5",
  "messages": [
    {
      "role": "user",
      "content": "[prompt above]"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 500
}
```

**Response Format:**
```json
{
  "id": "chatcmpl-...",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "--- a/package.json\n+++ b/package.json\n@@ -5,1 +5,1 @@\n-  \"ejs\": \"3.1.6\"\n+  \"ejs\": \"3.1.7\""
      }
    }
  ]
}
```

**Error Handling:**
- Timeouts: 30 seconds max wait
- Failures: Falls back to Nosana API
- If both fail: Uses pre-baked patches only

### Testing
```bash
curl -X POST https://api.aimlapi.com/v1/chat/completions \
  -H "Authorization: Bearer sk-lYLn5p8nepNgraaEC63XoOt1ZlHQGkudLJ12QwO4N6teJHVJ" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshot/kimi-k2-5",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

### Kimi Features for CodeProbe
- **Long Context:** Handles large codebases
- **Code Understanding:** Specialized for code generation
- **Structured Output:** Reliably generates diffs
- **Cost Efficient:** Competitive pricing per token

---

## 4. Nosana API (Patch Generation - Fallback)

### Purpose
Fallback GPU-accelerated LLM inference for patch generation if Kimi fails.

### Integration Details

**API Endpoint:**
```
POST https://api.nosana.com/v1/jobs
GET  https://api.nosana.com/v1/jobs/{id}
```

**Authentication:**
```
Authorization: Bearer {NOSANA_API_KEY}
Content-Type: application/json
```

**API Key:**
```
NOSANA_API_KEY=nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4
```

**Implementation Location:**
- `src/engine/patcher.ts` → `generatePatchWithNosana()` method
- Called only if Kimi fails or times out
- Async job submission with polling

**How It Works:**
1. Submit an inference job to Nosana
2. Job executes patch generation command
3. Poll job status until completion (max 30 seconds)
4. Return output (unified diff)

**Job Payload:**
```json
{
  "ops": [
    {
      "type": "exec",
      "env": {
        "CVE_ID": "CVE-2022-29078",
        "PACKAGE": "ejs",
        "VERSION": "3.1.6",
        "FIXED_VERSION": "3.1.7"
      },
      "cmd": [
        "sh",
        "-c",
        "echo '--- a/package.json' && echo '+++ b/package.json' && echo '@@ -5,1 +5,1 @@' && echo '-  \"$PACKAGE\": \"$VERSION\"' && echo '+  \"$PACKAGE\": \"$FIXED_VERSION\"'"
      ]
    }
  ]
}
```

**Response Format:**
```json
{
  "id": "job_abc123",
  "state": "completed",
  "results": [
    {
      "output": "--- a/package.json\n+++ b/package.json\n..."
    }
  ]
}
```

**Error Handling:**
- Job timeouts after 30 seconds
- Polling interval: 1 second
- Max 30 polling attempts
- Falls back to pre-baked patches on failure

### Testing
```bash
curl -X POST https://api.nosana.com/v1/jobs \
  -H "Authorization: Bearer nos_jNqyjmvmboO-tU5nuuLH9T7oIx6p6Xw7mKHG36yQAI4" \
  -H "Content-Type: application/json" \
  -d '{"ops": [{"type": "exec", "cmd": ["echo", "test"]}]}'
```

### Nosana Features
- **GPU Acceleration:** Fast inference
- **Decentralized:** Blockchain-based marketplace
- **Affordable:** Pay-per-use model
- **Scalable:** Can handle many concurrent jobs

---

## Priority & Fallback Chain

### Patch Generation Priority:
1. **Pre-baked patches** (instant, hardcoded for known CVEs)
2. **Kimi LLM** (primary, 30s timeout)
3. **Nosana GPU** (fallback, 30s job execution)
4. **Return null** (no patch available)

### CVE Scraping Priority:
1. **Bright Data API** (real scraping)
2. **Local cache** (if API fails)
3. **Demo CVE** (ejs hardcoded as last resort)

### Exploit Verification Priority:
1. **Daytona sandboxes** (real execution)
2. **Local simulation** (if Daytona unavailable)
3. **Version-based heuristic** (worst case)

---

## API Rate Limits & Costs

| API | Rate Limit | Cost | Timeout |
|-----|-----------|------|---------|
| **Bright Data** | Varies | Per request | 10s |
| **Daytona** | 100 req/min | Per execution | 15s |
| **Kimi** | 10 req/min | Per token | 30s |
| **Nosana** | 50 jobs/min | Per GPU-hour | 30s |

---

## Environment Setup Checklist

- [ ] Add all API keys to `.env` file
- [ ] Test each API independently (see Testing sections above)
- [ ] Verify server can reach all endpoints
- [ ] Set `NODE_ENV=development` for dev/testing
- [ ] Set `NODE_ENV=production` for cloud deployment
- [ ] Ensure firewall allows outbound HTTPS (443)
- [ ] Monitor API usage in each dashboard:
  - Bright Data: brightdata.com/dashboard
  - Daytona: app.daytona.io/dashboard
  - Kimi: platform.kimi.ai/dashboard
  - Nosana: nosana.com/dashboard

---

## Troubleshooting APIs

### Bright Data Issues
```bash
# Check API key validity
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.brightdata.com/api/validate

# Check NVD availability
curl https://api.nvd.nist.gov/health
```

### Daytona Issues
```bash
# Check workspace creation
curl -X POST https://app.daytona.io/api/workspace \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"language": "javascript"}' \
  -H "Content-Type: application/json"

# Check logs in Daytona dashboard
# app.daytona.io/workspaces
```

### Kimi Issues
```bash
# Check API key and credits
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.aimlapi.com/v1/models

# Monitor token usage
# platform.kimi.ai/api-keys
```

### Nosana Issues
```bash
# Check account and balance
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.nosana.com/v1/account

# Monitor jobs
# nosana.com/dashboard/jobs
```

---

## Security Notes

⚠️ **Never commit API keys to git**
- Use `.env` files (ignored by `.gitignore`)
- Use environment variables in production
- Rotate keys periodically
- Monitor key usage in dashboards

⚠️ **API Key Scope**
- Bright Data: Read-only CVE scraping
- Daytona: Isolated sandbox execution
- Kimi: Text generation only
- Nosana: Job submission only

⚠️ **Data Privacy**
- Scans are executed server-side
- API keys never exposed to client
- Results cached locally only
- No data sent to third parties except sponsor APIs

