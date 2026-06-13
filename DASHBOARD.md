# CodeProbe Dashboard — Stage 3

Production-grade React 18 dashboard with GitHub OAuth, risk gauges, CVE tables, business impact callouts, and patch diff viewers.

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Set Environment Variables
Create `.env.local`:
```env
VITE_GITHUB_CLIENT_ID=Ov23liN8SBt9rcom1Msm
NODE_ENV=development
```

### 3. Run Dev Servers (Two Terminals)

**Terminal 1: API Server** (port 3000)
```bash
bun run api
```

**Terminal 2: Frontend Dev** (port 5173)
```bash
bun run frontend
```

Or run both together:
```bash
bun run dev
```

### 4. Open Dashboard
- http://localhost:5173

### 5. Dev Login
- Click "Dev: Skip OAuth" button to bypass GitHub auth (dev mode only)

---

## Architecture

### API Server (`src/api/server.ts`)
- **Framework**: Bun.serve()
- **Routes**:
  - `GET /api/scans` — List all scans (auth required)
  - `GET /api/scans/:id` — Get scan detail (auth required)
  - `POST /api/auth/github` — GitHub OAuth callback
  - `GET /api/auth/logout` — Clear session
- **Auth**: Bearer token in Authorization header
- **CORS**: Enabled for localhost:5173

### Frontend (`src/dashboard/`)
- **Entry**: `main.tsx` (React 18 + Vite)
- **Styling**: TailwindCSS + custom CSS
- **State Management**: React hooks (useAuth, useScan, useScans)
- **Components**:
  - `RiskGauge` — 0–10 visual risk score
  - `CVETable` — Expandable vulnerability table
  - `BusinessImpactCard` — RED callout with $4.9M breach cost
  - `PatchDiffViewer` — Syntax-highlighted patch diffs
  - `ErrorBoundary` — Graceful error handling

### Pages
- **LoginPage** — GitHub OAuth + dev test login
- **ScansListPage** — Paginated, sortable, filterable scan list
- **ScanDetailPage** — Full scan details with all components

---

## Demo Data

Pre-loaded scans in `~/.codeprobe/scans/`:

### `demo-http2-rce.json` (Risk 9.2)
- **CVE**: CVE-2023-44487 (HTTP/2 RCE) — CRITICAL
- **Status**: Confirmed Exploitable
- **Impact**: $9.24M ($4.9M × 1.88 risk ratio)
- **Recommendation**: Patch within 24 hours

### `demo-sql-injection.json` (Risk 7.5)
- **CVE**: CVE-2023-21234 (SQL Injection) — HIGH
- **Status**: Confirmed Exploitable

Load them automatically on first API call. No data setup needed.

---

## Key Features

✅ **Risk Gauge**
- Circular 0–10 visual scale
- Color-coded: red (8–10), orange (6–7), yellow (4–5), green (0–3)
- Animated SVG circles with smooth transitions

✅ **Business Impact (Above Fold)**
- RED background + ⚠️ emoji — impossible to miss
- Shows: # confirmed RCEs, attack scenarios, $4.9M breach cost
- Recommends: "Patch within 24 hours"
- Grid layout: avg breach cost vs. your estimated risk

✅ **CVE Table**
- Columns: ID, Package, Severity, Status, Patch
- Expandable rows → description, affected versions, PoC, exploit evidence
- Sortable headers
- Color-coded severity: red (CRITICAL/HIGH), yellow (MEDIUM), green (LOW)

✅ **Patch Diff Viewer**
- Displays unified diff with copy-to-clipboard + download buttons
- Uses `<pre>` + `font-mono` for readability
- Max height 384px with overflow scroll

✅ **Scans List**
- Paginated (10 per page)
- Sortable by timestamp (newest first)
- Filterable: CRITICAL, HIGH, MEDIUM, LOW
- Risk score badge per row

✅ **Error & Empty States**
- Error boundary catches React crashes
- Empty state: "No scans yet. Run `codeprobe scan` from CLI."
- Failed load: "Failed to load scans. Try refreshing."
- 404 scan: "Scan not found. It may have been deleted."

✅ **Responsive Design**
- Mobile-first TailwindCSS
- Risk gauge + CVE table cards on mobile
- No horizontal scroll
- Test on: 375×667 (mobile), 768×1024 (tablet), 1920×1080 (desktop)

✅ **Performance**
- Lazy-load scan details on click
- Memoized components to prevent re-renders
- Code-split pages (list, detail, login)
- Target <2s full page load

---

## GitHub OAuth Setup (Production)

### Register OAuth App
1. Go to https://github.com/settings/developers → OAuth Apps
2. Create new OAuth Application
3. Set **Authorization callback URL**: `http://localhost:3000/api/auth/github`
4. Copy **Client ID** and **Client Secret**

### Environment Variables
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### Server (`src/api/server.ts`)
OAuth flow:
1. Frontend redirects to GitHub consent page
2. User approves → GitHub redirects to `/api/auth/github?code=...`
3. Server exchanges code for access_token via GitHub API
4. Server stores token, returns session token to frontend
5. Frontend stores session token in localStorage
6. All API requests include `Authorization: Bearer {token}`

---

## Development Tips

### Test Dev Login
- Click "Dev: Skip OAuth" (only visible in dev mode)
- Creates fake token: `dev-token-{timestamp}`
- Server accepts any Bearer token in dev mode

### Local API Testing
```bash
curl -H "Authorization: Bearer test-token" http://localhost:3000/api/scans
```

### Vite HMR (Hot Module Replacement)
- Edit a component → browser auto-refreshes
- Edit CSS → styles update without reload
- Running on http://localhost:5173 with proxy to :3000

### Build for Production
```bash
bun run build
# Output: dist/
```

---

## Acceptance Criteria (MVP)

✅ React dashboard loads without errors
✅ GitHub OAuth login works (or dev test login)
✅ Scans list displays recent scans
✅ Scan detail shows:
  - Risk score gauge (0–10, color-coded)
  - CVE table (ID, severity, status)
  - Business impact callout ($4.9M)
  - Patch diff (syntax-highlighted)
✅ Error states defined
✅ Empty state messaging
✅ Dashboard loads in <2s
✅ Responsive on mobile (manual visual test)
✅ Integration tests pass

---

## Integration Tests

```bash
bun test
```

Tests cover:
- OAuth login flow
- Scan list loading
- Scan detail rendering
- Business impact calculation
- Patch diff display

---

## Performance Checklist

- [ ] Lighthouse score >80 on mobile
- [ ] First Contentful Paint <1s
- [ ] Largest Contentful Paint <2s
- [ ] No layout shifts on load
- [ ] No unused CSS/JS
- [ ] Images optimized (SVG for icons, JPEG for photos)
- [ ] Fonts preloaded (if custom)
- [ ] API responses cached where possible

---

## Known Limitations (Post-Hackathon)

- No PDF export yet
- No scan sharing (one-time link)
- No supply chain attack warnings banner
- No accessibility labels (ARIA) yet
- No database (uses local JSON files)
- No user accounts / team management
- No historical trends / reporting

---

## Troubleshooting

### API server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

### Frontend won't load
```bash
# Check if port 5173 is in use
lsof -i :5173
# Ensure API server is running on :3000
curl http://localhost:3000/api/scans  # Should show CORS error or 401
```

### "Failed to load scans" error
- Ensure API server is running (`bun run api`)
- Check browser console for network errors
- Verify Bearer token is set in localStorage

### OAuth callback fails
- GitHub app credentials wrong? Check `.env.local`
- Callback URL in GitHub settings must match redirectUri
- For dev, use "Dev: Skip OAuth" button instead

---

## Next Steps (Post-Hackathon)

- [ ] Add PDF export (react-pdf library)
- [ ] Add scan sharing (generate one-time links)
- [ ] Add supply chain warnings banner
- [ ] Add ARIA labels for accessibility
- [ ] Migrate to database (PostgreSQL or MongoDB)
- [ ] Add user accounts + team management
- [ ] Add historical trends + reporting
- [ ] Deploy to production (Vercel, Railway, or custom)

---

**Ready for demo day!** 🚀
