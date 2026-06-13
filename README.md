# CodeProbe

Automated vulnerability scanner for Node.js / npm projects. Scans dependencies against OSV.dev and the GitHub Advisory Database, verifies exploits in isolated sandboxes, and optionally auto-patches vulnerable packages.

## Install

```sh
npm install -g codeprobe-scanner
```

Or run without installing:

```sh
npx codeprobe-scanner scan
```

## Quick Start

```sh
# Scan the current directory
codeprobe scan

# Scan a specific project
codeprobe scan ./my-app

# Scan and auto-fix vulnerabilities
codeprobe scan --fix

# Output results as JSON
codeprobe scan --json > report.json

# Show the last scan report
codeprobe report
```

## Commands

### `codeprobe scan [path]`

Scans a repository for known CVEs in its npm dependencies.

| Flag | Description |
|------|-------------|
| `--fix` | Auto-fix: upgrades vulnerable packages, creates a git branch and commit |
| `--json` | Print results as JSON (pipe-friendly) |
| `--verbose` | Show detailed phase-by-phase logs |

**What it does:**

1. Parses `package.json` / `package-lock.json` / `bun.lock` for installed packages and versions
2. Queries **OSV.dev** for CVEs matching each package+version
3. Cross-references the **GitHub Advisory Database** for additional intelligence
4. Runs exploit verification in an isolated **Daytona sandbox** (when configured)
5. Saves the report to `~/.codeprobe/scans/<scan-id>.json`
6. Displays a risk score, CVE table, and recent npm threat feed

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | No vulnerabilities found |
| `1` | Vulnerabilities found |
| `2` | Scan failed |

### `codeprobe report`

Displays the most recent scan results from `~/.codeprobe/scans/latest.json`.

### `codeprobe config set <key> <value>`

Saves a configuration value to `~/.codeprobe/config.json`.

```sh
codeprobe config set bright_data_api_key YOUR_KEY
codeprobe config set daytona_api_key YOUR_KEY
```

## Configuration

CodeProbe works out of the box with zero configuration using public APIs. Optional integrations unlock deeper exploit verification.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `BRIGHT_DATA_API_KEY` | Bright Data scraping proxy (optional) |
| `DAYTONA_API_KEY` | Daytona sandbox for exploit verification (optional) |
| `NOSANA_API_KEY` | Nosana LLM for AI-assisted analysis (optional) |
| `GITHUB_TOKEN` | GitHub token for higher Advisory API rate limits |
| `PORT` | API server port (default: `3000`) |

Create a `.env` file in your project root or export variables in your shell.

## How It Works

```
package.json / lockfile
        ↓
   Dependency Parser
        ↓
  OSV.dev + GitHub Advisory DB  ──→  CVE list
        ↓
  Sandbox Exploit Verification  ──→  Confirmed / Theoretical
        ↓
   Risk Score + Report
```

- **Risk score** = (confirmed exploitable × 10) + (theoretical × 3)
- Scans are saved locally at `~/.codeprobe/scans/`
- `latest.json` always points to the most recent scan

## Auto-Fix (`--fix`)

When `--fix` is passed, CodeProbe:

1. Identifies vulnerable packages that have a patched version available
2. Updates `package.json` to the safe version
3. Runs `bun install` (or `npm install`) to apply the change
4. Creates a git commit on a new branch: `codeprobe-fix/<scan-id>`

Review the branch and open a PR — no changes are pushed automatically.

## API Server

Start the REST API server:

```sh
bun run src/api/server.ts
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/scan` | POST | Trigger a scan (`{ "repoPath": "./path" }`) |
| `GET /api/scans` | GET | List all past scans (requires auth) |
| `GET /api/scans/:id` | GET | Get a specific scan (requires auth) |
| `GET /api/auth/github` | GET | GitHub OAuth callback |
| `GET /api/auth/logout` | GET | Logout |

Authentication: pass a `Bearer <token>` header. In development mode any non-empty token is accepted.

## Docker

```sh
docker build -t codeprobe .
docker run -e PORT=8080 -p 8080:8080 codeprobe
```

## GitHub Actions

Add CodeProbe to your CI pipeline:

```yaml
# .github/workflows/codeprobe-scan.yml
name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx codeprobe-scanner scan --json > report.json
      - uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: report.json
```

## Output Example

```
╔══════════════════════════════════════════╗
║           CodeProbe Scanner              ║
╚══════════════════════════════════════════╝

SCAN COMPLETE
Risk Score: 🔴 HIGH (43)
Confirmed Exploitable: 2 | Theoretical Risk: 5
Patches Available: 3
Duration: 8.3s

CVE Details:
  CVE-2022-29078: ejs 3.1.6 [CRITICAL] ✓ CONFIRMED EXPLOITABLE
    → Patch available: 3.1.7
  CVE-2023-44487: http2-server 1.0.0 [HIGH] ✓ CONFIRMED EXPLOITABLE
    → Patch available: 1.0.1

🌐 Recent npm Security Threats (GitHub Advisory Database):
  CRITICAL lodash - Prototype Pollution
  HIGH     axios - SSRF via redirect
```

## Project Structure

```
src/
├── cli/          # CLI entry point and commands (scan, report, config)
├── engine/       # Core scanner: parser, scraper, sandbox, patcher
├── api/          # REST API server
├── shared/       # Types, constants, utilities
├── integrations/ # VideoDB, Daytona, Nosana integrations
├── bot/          # Bot server
└── mcp/          # MCP server
bin/
└── codeprobe.cjs # CLI binary entry point
```

## License

MIT
