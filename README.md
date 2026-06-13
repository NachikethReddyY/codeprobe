# CodeProbe Scanner 🔍

**Full-stack vulnerability scanner with automatic code fixing and Kimi AI patch generation.**

CodeProbe is an advanced security scanner that analyzes both your npm dependencies AND your actual source code to find and automatically fix security vulnerabilities. It combines CVE detection, SAST analysis, and AI-powered patch generation into one unified tool.

## ✨ Key Features

### 🔍 Dual-Layer Vulnerability Detection
- **Dependency Scanning** — Checks npm packages against OSV.dev + npm advisory databases
- **Source Code Analysis (SAST)** — Scans actual code for 7+ vulnerability patterns

### 🔐 Detects & Fixes
- Hardcoded secrets → Replaced with `process.env`
- SQL injection patterns
- Command injection vulnerabilities
- XSS vulnerabilities
- Path traversal issues
- Insecure random generation
- Insecure eval/Function() usage

### 🔧 Automatic Fixing
- **Source Code Fixes** — Repairs vulnerabilities in your code automatically
- **Package Updates** — Suggests and applies secure versions
- **Kimi LLM Integration** — Generates intelligent patches using AI

### 🏗️ Recursive Scanning
- Automatically finds all `package.json` files in subdirectories
- Perfect for monorepos and multi-package projects
- Aggregates results across all packages

### 📊 Comprehensive Reporting
- Risk score calculation (0-10)
- CVE severity and exploitability
- Proof-of-concept recordings
- Recent security threat alerts

## 🚀 Installation

### Global Installation
```bash
npm install -g codeprobe-scanner
```

### Project Installation
```bash
npm install --save-dev codeprobe-scanner
```

### Run Without Installing
```bash
npx codeprobe-scanner scan .
```

## ⚡ Quick Start

### 1. Set Up Kimi API (Recommended)

Get your API key from [Kimi Platform](https://kimi.moonshot.cn):

```bash
# Option A: CLI Configuration
codeprobe config set kimi_api_key sk-YOUR_KEY_HERE

# Option B: Environment Variable
export KIMI_API_KEY=sk-YOUR_KEY_HERE

# Option C: Manual Configuration
# Edit ~/.codeprobe/config.json and add your key
```

### 2. Scan Your Project

**Find vulnerabilities:**
```bash
codeprobe scan .
```

**Find AND fix vulnerabilities:**
```bash
codeprobe scan . --fix
```

## 📖 Usage Examples

### Basic Vulnerability Scan
```bash
$ codeprobe scan .

⚡ CodeProbe v1.0.20
🔍 Searching for package.json files...
   Found 1 package.json file(s)

📂 Scanning: .
📦 Parsing dependencies...
   Found 8 dependencies
🔍 Checking OSV.dev + npm advisory database...
   Found 13 CVEs

🔐 Analyzing source code for vulnerabilities...
   Found 4 potential vulnerabilities

────────────────────────────────────────────
SCAN COMPLETE
Risk Score: 2.2/10 (LOW)
Confirmed Exploitable: 0 | Theoretical Risk: 13
Patches Available: 1/13
Duration: 1s
```

### Automatic Vulnerability Fixing
```bash
$ codeprobe scan . --fix

🔧 Applying source code fixes...
   ✓ Fixed 1 issues in server.js
   ✓ Fixed 3 issues in seed.js
   Applied 4 code fixes

📝 Fixed vulnerabilities:
   - server.js:28 - Hardcoded Secret
   - seed.js:16 - Hardcoded Secret
   - seed.js:17 - Hardcoded Secret
   - seed.js:18 - Hardcoded Secret
```

### Configuration Management
```bash
# Set API keys
codeprobe config set kimi_api_key sk-YOUR_KEY
codeprobe config set github_token ghp_YOUR_TOKEN
codeprobe config set bright_data_api_key YOUR_KEY

# View configuration
codeprobe config get kimi_api_key

# Clear configuration
codeprobe config clear kimi_api_key
```

## 🛠️ Commands

### `codeprobe scan [path]`

Scans for vulnerabilities in dependencies and source code.

| Flag | Description |
|------|-------------|
| `--fix` | Auto-fix vulnerabilities in code + update packages |
| `--json` | Output results as JSON |
| `--verbose` | Show detailed logs |

### `codeprobe report`

Shows the last scan results from `~/.codeprobe/scans/latest.json`.

### `codeprobe config`

Manage configuration:
```bash
codeprobe config set <key> <value>
codeprobe config get <key>
codeprobe config clear <key>
```

## 🔐 How It Works

### Scan Pipeline

```
1️⃣ Discovery
   Find all package.json files recursively
        ↓
2️⃣ Dependency Scanning
   Parse packages → Check CVE databases
        ↓
3️⃣ Source Code Analysis
   Scan .ts/.js files → Detect security patterns
        ↓
4️⃣ Exploit Verification
   Test vulnerabilities in sandboxes (Daytona)
        ↓
5️⃣ Patch Generation
   Generate fixes using Kimi LLM
        ↓
6️⃣ Risk Scoring & Reporting
   Calculate risk → Save results
        ↓
7️⃣ Auto-Fixing (if --fix flag)
   Replace secrets → Update packages → Commit
```

## 📋 Vulnerability Types

| Type | Detection | Automatic Fix |
|------|-----------|---|
| **Hardcoded Secrets** | API keys, passwords, tokens | ✅ Replace with `process.env` |
| **Command Injection** | Unescaped shell commands | ✅ Add proper escaping |
| **SQL Injection** | Dynamic SQL queries | ⚠️ Suggest parameterized queries |
| **XSS** | innerHTML, dangerouslySetInnerHTML | ✅ Use textContent |
| **Insecure Random** | Math.random() for security | ✅ Use crypto.randomBytes() |
| **Path Traversal** | Unvalidated file paths | ⚠️ Suggest validation |
| **Insecure Eval** | eval(), Function() usage | ⚠️ Suggest alternatives |

## ⚙️ Configuration

### Config File
```
~/.codeprobe/config.json
```

### API Keys (Encrypted)
```json
{
  "kimi_api_key": "sk-...",
  "github_token": "ghp_...",
  "bright_data_api_key": "...",
  "daytona_api_key": "..."
}
```

All secrets are encrypted using AES-256-GCM.

### Environment Variables (Override Config)
```bash
export KIMI_API_KEY=sk-...
export GITHUB_TOKEN=ghp_...
export BRIGHT_DATA_API_KEY=...
export DAYTONA_API_KEY=...
```

## 🔒 Security

### Built-In Security Features
- ✅ **Encrypted Config** — API keys encrypted in `~/.codeprobe/config.json`
- ✅ **No Hardcoded Secrets** — Detects and fixes credentials in code
- ✅ **Command Injection Prevention** — Proper shell escaping
- ✅ **Secure Random** — Uses `crypto.randomBytes()`
- ✅ **Full SAST Analysis** — Comprehensive source code scanning
- ✅ **Zero Vulnerabilities** — See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

### Privacy
- Scans run locally on your machine
- Reports saved to `~/.codeprobe/scans/` (private)
- Kimi only called for patch generation (configurable)

## 📁 Output Files

### Scan Reports
```
~/.codeprobe/scans/
├── scan_<timestamp>.json   # Individual scans
└── latest.json             # Latest scan
```

### Fixed Code
```
.proofs/
├── CVE-2022-29078_timestamp.json
└── ...
```

## 🚀 Advanced Usage

### Monorepo Scanning
```bash
codeprobe scan /path/to/monorepo
# Automatically finds and scans all package.json files
```

### JSON Export
```bash
codeprobe scan . --json > report.json
```

### Verbose Output
```bash
codeprobe scan . --verbose
```

### Combined Options
```bash
codeprobe scan . --fix --verbose --json
```

## 🐛 Troubleshooting

### "No Kimi API key configured"
```bash
codeprobe config set kimi_api_key sk-YOUR_KEY
```

### "No package.json files found"
Make sure your project has a `package.json` file.

### "Uncommitted changes detected"
After `--fix`, commit the changes:
```bash
git add -A
git commit -m "Security fixes: patch vulnerabilities"
```

## 📊 Performance

| Task | Time |
|------|------|
| Dependency scanning | 1-3s |
| Source code analysis | <1s per 100 files |
| Exploit verification | 2-10s |
| Patch generation | 5-15s |
| **Total** | **1-30s** |

## 🏗️ Project Structure

```
src/
├── cli/           # CLI commands and interface
├── engine/        # Core scanner modules
│   ├── parser.ts      # Package parsing
│   ├── scraper.ts     # CVE database queries
│   ├── sast.ts        # Source code analysis
│   ├── code-fixer.ts  # Automatic code fixing
│   ├── patcher.ts     # Patch generation (Kimi)
│   └── sandbox.ts     # Exploit verification
├── shared/        # Types and utilities
├── api/           # REST API (optional)
└── integrations/  # Daytona, VideoDB, etc.
```

## 📚 Examples

### Scan Your Project
```bash
codeprobe scan .
```

### Fix All Vulnerabilities
```bash
codeprobe scan . --fix
git add -A && git commit -m "Security fixes"
git push
```

### Scan Monorepo
```bash
codeprobe scan ./monorepo
```

### Export as JSON
```bash
codeprobe scan . --json | jq '.summary'
```

## 🔗 Integration

### GitHub Actions
```yaml
name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx codeprobe-scanner scan --json
```

### Pre-commit Hook
```bash
#!/bin/sh
codeprobe scan . || exit 1
```

## 📄 License

MIT License - See LICENSE file

## 🙏 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📞 Support

- 🐛 [Issue Tracker](https://github.com/NachikethReddyY/codeprobe/issues)
- 💬 [Discussions](https://github.com/NachikethReddyY/codeprobe/discussions)
- 📖 [Full Documentation](./SECURITY_AUDIT.md)

## 📝 Changelog

### v1.0.20
- ✨ Integrated SAST code vulnerability scanning
- ✨ Automatic source code fixing
- 🔒 Fixed code fixer to actually apply fixes
- 🔒 Kimi as primary patch generator

### v1.0.19
- ✨ Full codebase scanning
- ✨ Automatic code fixing

### v1.0.18
- ✨ Security audit (0 vulnerabilities found)

### v1.0.17
- ✨ Kimi patch generation enabled
- 🔧 Fixed patches_available reporting

### v1.0.16
- ✨ SAST scanner implementation
- 🔒 Fixed security vulnerabilities

### v1.0.15
- ✨ Recursive package.json scanning

### v1.0.14
- 🔒 Fixed VideoDB proof recording

---

**CodeProbe: Security, Simplified** 🚀

[GitHub](https://github.com/NachikethReddyY/codeprobe) | [npm](https://npmjs.com/package/codeprobe-scanner) | [Issues](https://github.com/NachikethReddyY/codeprobe/issues)
