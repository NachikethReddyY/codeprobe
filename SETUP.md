# CodeProbe Setup Guide

## Prerequisites

- **Bun** v1.3.14+ ([install here](https://bun.sh))
- **Node.js** 18+ (for some dev dependencies)
- **Git** for version control

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NachikethReddyY/codeprobe.git
   cd codeprobe
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Verify installation**
   ```bash
   bun run src/cli/index.ts --help
   ```

## Configuration

CodeProbe requires API keys for external services:

### 1. Bright Data API (for CVE scraping)
```bash
bun run src/cli/index.ts config set bright_data_api_key <your-key>
```

### 2. Daytona API (for sandbox execution)
```bash
bun run src/cli/index.ts config set daytona_api_key <your-key>
```

### 3. Nosana API (for patch generation)
```bash
bun run src/cli/index.ts config set nosana_api_key <your-key>
```

View your config:
```bash
bun run src/cli/index.ts config get
```

## Quick Start

### CLI Usage

**Scan current directory:**
```bash
bun run src/cli/index.ts scan
```

**Scan specific repository:**
```bash
bun run src/cli/index.ts scan ./path/to/repo
```

**Scan with auto-fix:**
```bash
bun run src/cli/index.ts scan --fix
```

**Output as JSON:**
```bash
bun run src/cli/index.ts scan --json > report.json
```

**View last scan:**
```bash
bun run src/cli/index.ts report
```

### API Server

Start the backend API:
```bash
bun run api
```

Runs on `http://localhost:3000` by default.

### Frontend Dashboard

In a separate terminal:
```bash
bun run frontend
```

Runs on `http://localhost:5173`.

**To run both together:**
```bash
# Terminal 1
bun run api

# Terminal 2
bun run frontend
```

Then open `http://localhost:5173`.

### GitHub Bot

Deploy the bot:
```bash
bun run bot
```

The bot automatically scans pull requests and comments with vulnerability findings.

### MCP Server (Claude Desktop)

Run the MCP server for integration with Claude:
```bash
bun run mcp
```

This allows you to use CodeProbe from Claude Desktop.

## Project Structure

```
codeprobe/
├── src/
│   ├── cli/              # Command-line interface
│   ├── api/              # REST API server
│   ├── dashboard/        # React frontend
│   ├── bot/              # GitHub bot
│   ├── mcp/              # Model Context Protocol server
│   ├── engine/           # Core scanning & patching engine
│   │   ├── parser.ts     # Dependency manifest parser
│   │   ├── scraper.ts    # CVE data scraper (Bright Data)
│   │   ├── matcher.ts    # CVE matching logic
│   │   ├── sandbox.ts    # Exploit verification (Daytona)
│   │   ├── patcher.ts    # Patch generation (Nosana)
│   │   └── report.ts     # Report builder
│   ├── shared/           # Shared types & utilities
│   └── test/             # Test files
├── package.json
├── bun.lockb
└── README.md
```

## Development

### Run Tests

```bash
bun test
```

### Run in Development Mode

API with hot reload:
```bash
bun run api
```

Frontend with hot reload:
```bash
bun run frontend
```

### Build for Production

Dashboard:
```bash
bun run build
```

Output goes to `dist/`.

## How CodeProbe Works

### Scan Flow

1. **Parse Dependencies** — Reads `package.json`, `requirements.txt`, `Cargo.toml`, etc.
2. **Scrape CVEs** — Fetches vulnerability data from NVD, Exploit-DB, Snyk (via Bright Data)
3. **Match CVEs** — Links found CVEs to specific dependency versions
4. **Filter by Severity** — Focuses on CRITICAL/HIGH severity vulnerabilities
5. **Run Exploit Verification** — Spins up isolated sandboxes (Daytona) and executes proof-of-concept exploits
6. **Confirm Exploitability** — Marks CVEs as confirmed or theoretical
7. **Generate Patches** — Creates verified patch diffs using LLM (Nosana)
8. **Build Report** — Generates final report with risk score, findings, and patches

### Output

Scan results are saved to:
```
~/.codeprobe/scans/
├── scan_<timestamp>_<id>.json
└── latest.json
```

Each report contains:
- Scan metadata (time, repository, risk score)
- Dependency list
- CVE findings with exploitability status
- Patch diffs for confirmed vulnerabilities
- SARIF format for CI/CD integration

## Troubleshooting

### Missing dependencies
```bash
bun install
```

### API key errors
Verify your config:
```bash
bun run src/cli/index.ts config get
```

### Port already in use
Change the port in `src/api/server.ts` or kill the existing process.

### Lockfile corruption
Delete `bun.lockb` and reinstall:
```bash
rm bun.lockb
bun install
```

## Environment Variables

Set in `.env`:
```env
BRIGHT_DATA_API_KEY=<your-key>
DAYTONA_API_KEY=<your-key>
NOSANA_API_KEY=<your-key>
PORT=3000
```

Bun loads `.env` automatically.

## Next Steps

- Read [codeprobe-prd.md](./codeprobe-prd.md) for feature specifications
- Check [README.md](./README.md) for overview
- Review `src/engine/index.ts` for core scanning logic
