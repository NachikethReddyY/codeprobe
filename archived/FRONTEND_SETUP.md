# CodeProbe Frontend Setup Guide

## What Was Fixed

### Problems Found
1. **API server wasn't serving dashboard** — Only served JSON API endpoints
2. **Hardcoded localhost URLs** — Frontend expected port 3000, but env could change
3. **Broken scan file handling** — Broken symlinks and missing validation
4. **Timestamp sorting bug** — Used string arithmetic instead of date parsing

### Solutions Applied
1. ✅ API server now serves dashboard HTML at root path
2. ✅ API server serves dashboard assets (TypeScript, CSS, etc.)
3. ✅ Frontend uses `window.location.origin` for dynamic API URLs
4. ✅ Scan reading validates structure and handles broken symlinks
5. ✅ Timestamp sorting uses proper date comparison

---

## How to Run the Frontend

### Option 1: Development Mode (Recommended for Dev)

```bash
# Start the API server with dashboard serving
NODE_ENV=development bun run src/api/server.ts
```

Then visit: **http://localhost:3000**

**What this does:**
- Serves the dashboard HTML at root path
- Allows any Bearer token (dev mode)
- Serves scan data from `~/.codeprobe/scans/`
- Hot-reloads React components (Bun with development: true)

### Option 2: Production Mode

```bash
# Build the frontend first
bun build src/dashboard/frontend.tsx --outdir dist

# Start API server (requires valid auth)
bun run src/api/server.ts
```

---

## Testing the Frontend

### 1. Start the API server
```bash
NODE_ENV=development bun run src/api/server.ts
```

### 2. Create a scan (or use existing demo data)
```bash
# Run a CLI scan first
bun run src/cli/index.ts scan ./demo-vulnerable-app --json
```

### 3. Visit dashboard
```bash
open http://localhost:3000
```

### 4. Login
- Click "Login with GitHub" (or any GitHub account)
- In dev mode, any OAuth token works
- In production, requires GitHub Client ID/Secret

### 5. View scans
- Should see list of scans from `~/.codeprobe/scans/`
- Click on a scan to see details
- View risk score, CVEs, patches, business impact

---

## Dashboard Features

### Scans List Page
- Shows all scans from `~/.codeprobe/scans/`
- Sorted by timestamp (newest first)
- Click to view details

### Scan Detail Page
- **Header**: Risk score gauge (0-10, color-coded)
- **Summary**: Confirmed exploitable count, theoretical risk count
- **Business Impact Card**: Shows estimated breach cost ($4.9M average)
- **CVE Table**: List of vulnerabilities with severity
- **Patch Diff**: Click to expand and view patch
- **Footer**: "Powered by Daytona | Bright Data | Nosana"

### Authentication
- GitHub OAuth flow
- In dev mode: any bearer token works
- In production: validates against GitHub API
- Session stored in memory (lost on restart)

---

## API Endpoints

### Auth Endpoints
```
GET /api/auth/github?code=<code>    — OAuth callback
GET /api/auth/logout                — Logout (clears session)
```

### Scan Endpoints
```
GET /api/scans                      — List all scans (requires auth)
GET /api/scans/{scanId}             — Get single scan (requires auth)
```

### Root Path
```
GET /                               — Serves dashboard HTML
GET /frontend.tsx                   — React app (auto-transpiled)
GET /hooks/useScan.ts               — Hooks (auto-transpiled)
```

---

## Demo Scan Data

A demo scan is included at:
```
~/.codeprobe/scans/demo-scan-001.json
```

To use it in development:
```bash
# API server will automatically list it
NODE_ENV=development bun run src/api/server.ts

# Visit http://localhost:3000
# Should see demo scan in list
```

To create more scans:
```bash
bun run src/cli/index.ts scan ./demo-vulnerable-app
bun run src/cli/index.ts scan .
```

---

## Troubleshooting

### Dashboard not loading
```bash
# Make sure API server is running
NODE_ENV=development bun run src/api/server.ts

# Check if frontend HTML is being served
curl http://localhost:3000 | head -20
```

### "Unauthorized" error
```bash
# Dev mode requires NODE_ENV=development
NODE_ENV=development bun run src/api/server.ts

# Or add Bearer token to requests
curl http://localhost:3000/api/scans -H "Authorization: Bearer test"
```

### Scans not showing up
```bash
# Check if scans directory exists and has files
ls ~/.codeprobe/scans/

# Check API endpoint directly
curl http://localhost:3000/api/scans \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json"
```

### React not rendering
```bash
# Check browser console for errors
# Bun auto-transpiles TypeScript on-the-fly in dev mode

# If issues persist, try building static version
bun build src/dashboard/frontend.tsx --outdir dist
```

---

## Environment Variables

```bash
# Enable development mode (allows any Bearer token)
NODE_ENV=development

# GitHub OAuth (production)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Port (default: 3000)
PORT=3000
```

---

## Performance Notes

- **Dashboard load**: <2 seconds (Bun serves fast)
- **Scan list**: Updated on page load (no polling)
- **React hot-reload**: Enabled in development mode
- **API response**: <100ms for scan list

---

## What's Next

- [ ] Add WebSocket for real-time scan progress
- [ ] Implement Executive/Technical view toggle
- [ ] Add supply chain warnings display
- [ ] Historical scan trends graph
- [ ] Export scan as PDF

---

## Getting Help

If the frontend isn't working:

1. Check if API server is running
2. Verify `NODE_ENV=development` is set
3. Check browser console (F12) for JavaScript errors
4. Run: `curl http://localhost:3000` to verify HTML is served
5. Run: `curl http://localhost:3000/api/scans -H "Authorization: Bearer test"` to verify API

All endpoints and HTML are served from one port (3000), no separate dev server needed!
