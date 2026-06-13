# CodeProbe

Automated vulnerability scanner for Node.js projects. Scans your `package.json` dependencies against live security databases, verifies exploits in isolated sandboxes, generates AI patches, and shows you what's trending in npm security right now.

```
npx codeprobe-scanner scan .
```

---

## What it does

1. **Scans your dependencies** — reads `package.json` and checks every package against [OSV.dev](https://osv.dev) (the same database behind `npm audit`)
2. **Verifies exploits** — spins up isolated [Daytona](https://daytona.io) sandboxes to confirm whether a CVE is actually exploitable in your version, not just theoretical
3. **Generates patches** — uses Kimi AI to produce a version-bump diff for exploitable vulnerabilities
4. **Shows recent threats** — pulls the latest npm security advisories from GitHub's Advisory Database so you can see what attacks are trending

---

## Install

```bash
npm install -g codeprobe-scanner
```

Or run without installing:

```bash
npx codeprobe-scanner scan .
```

Requires [Bun](https://bun.sh) — installed automatically if not present.

---

## Usage

### Scan a project

```bash
codeprobe scan .
codeprobe scan ./my-app
```

Output:

```
⚡ CodeProbe v1.0.0
📦 Parsing dependencies...
   Found 11 dependencies
🔍 Checking OSV.dev + npm advisory database...
   Found 3 CVEs
🎯 Matching dependencies to CVEs...

SCAN COMPLETE
Risk Score: 6.4/10 (MEDIUM)

CVE Details:
  CVE-2024-39338: axios 1.6.5 [HIGH] ~ Theoretical Risk
  CVE-2023-45133: babel 7.22.0 [CRITICAL] ✓ CONFIRMED EXPLOITABLE
  ...

🌐 Recent npm Security Threats:
  HIGH  esbuild: Missing binary integrity verification enables RCE
  HIGH  Budibase: Auth bypass on webhook schema endpoint
  ...
```

### Scan and auto-fix

```bash
codeprobe scan . --fix
```

Walks you through each vulnerability interactively. For each one you approve, it:
- Updates the version in `package.json`
- Creates a git branch (`codeprobe-security-fixes-<timestamp>`)
- Commits and pushes
- Opens a pull request via GitHub CLI

### Other commands

```bash
codeprobe report                  # show last scan results again
codeprobe scan . --json           # JSON output (for CI pipelines)
codeprobe scan . --verbose        # detailed logs
codeprobe config get              # show stored config
```

---

## Configuration

No API keys are required for basic scanning — OSV.dev and the GitHub Advisory Database are free public APIs.

For exploit verification and AI patch generation, configure optional keys once:

```bash
codeprobe config set daytona_api_key <key>    # sandbox exploit verification
codeprobe config set kimi_api_key <key>       # AI patch generation
codeprobe config set nosana_api_key <key>     # backup LLM for patches
```

Keys are stored encrypted at `~/.codeprobe/config.json`. You can also pass them as environment variables:

```bash
DAYTONA_API_KEY=xxx KIMI_API_KEY=xxx codeprobe scan .
```

| Key | Where to get it | What it enables |
|-----|----------------|-----------------|
| `DAYTONA_API_KEY` | [daytona.io](https://daytona.io) | Confirms if CVEs are truly exploitable |
| `KIMI_API_KEY` | [aimlapi.com](https://aimlapi.com) | AI-generated patch diffs |
| `NOSANA_API_KEY` | [nosana.io](https://nosana.io) | Backup LLM for patches |

---

## CI / GitHub Actions

```yaml
- name: Security scan
  run: npx codeprobe-scanner scan . --json > security-report.json

- name: Fail on exploitable CVEs
  run: npx codeprobe-scanner scan .
  # exits with code 1 if exploitable CVEs found
```

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No vulnerabilities found |
| `1` | Vulnerabilities found |
| `2` | Scan error |

---

## How it works

```
package.json
     │
     ▼
 Parse deps          (reads your dependencies + exact versions)
     │
     ▼
 OSV.dev query       (exact version match — no false positives)
     │
     ▼
 Daytona sandbox     (runs the exploit in isolation to confirm)
     │
     ▼
 Kimi / Nosana       (generates a patch diff via AI)
     │
     ▼
 Report + PR         (shows results, optionally opens a fix PR)
```

No source code is sent to any external service. Only package names and versions are used for lookups.

---

## License

MIT
