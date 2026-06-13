# CodeProbe Demo: Vulnerable Node.js App

This is a deliberately vulnerable Node.js application used to demonstrate CodeProbe's exploit verification capabilities.

## Vulnerabilities

### CVE-2022-29078: EJS Template Injection RCE

**Affected Package:** `ejs@3.1.6`  
**Severity:** CRITICAL (CVSS 9.8)  
**Issue:** The EJS template engine allows template injection attacks that lead to arbitrary code execution.

**How it's vulnerable:**
- Line in `server.js`: `ejs.render(req.query.template, ...)`
- User can inject malicious EJS template expressions
- Server executes arbitrary JavaScript code

**Exploit:**
```bash
curl "http://localhost:3000/?template=<%= require('child_process').execSync('whoami') %>"
```

**Fix:** Upgrade `ejs` to version 3.1.7 or higher.

## Running the Demo App

```bash
cd demo-vulnerable-app
npm install
npm start
```

The app listens on `http://localhost:3000`.

## Using CodeProbe to Scan

```bash
# From the codeprobe root directory:
bun run src/cli/index.ts scan ./demo-vulnerable-app

# Or with JSON output:
bun run src/cli/index.ts scan ./demo-vulnerable-app --json
```

## Expected Output

CodeProbe will:
1. **Parse dependencies** — Extract EJS 3.1.6 from package.json
2. **Scrape CVE data** — Find CVE-2022-29078 in NVD (via Bright Data)
3. **Match versions** — Detect that EJS 3.1.6 is vulnerable
4. **Verify in sandbox** — Spawn a Daytona container and execute the PoC exploit
5. **Generate patch** — Create a patch to upgrade EJS to 3.1.7
6. **Report findings** — Display "CONFIRMED EXPLOITABLE" with business impact ($4.9M breach cost)

## Why This Demo?

- **Realistic vulnerability**: EJS template injection is a real, widely-exploited vulnerability
- **Node.js native**: Works in isolated containers without external dependencies
- **Clear proof**: Exploit evidence is captured in sandbox logs
- **Fast verification**: Exploit runs in < 2 seconds

## Files

- `package.json` — Intentionally pinned to vulnerable EJS 3.1.6
- `server.js` — Express server with template injection vulnerability
- `.github/workflows/codeprobe.yml` — CI/CD integration example

## Disclaimer

This app is for **security research and education only**. Do not use in production or with untrusted code.
