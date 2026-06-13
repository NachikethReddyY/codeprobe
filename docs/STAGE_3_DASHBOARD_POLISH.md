# CodeProbe MVP — Stage 3: Dashboard + Auth + Polish
**Duration:** 4–7 hours  
**Team:** 1–2 engineers (frontend + backend)  
**Dependency:** Stage 2 must be working  

---

## Overview

Build the **React dashboard** with GitHub OAuth auth, display scan results, show business impact. This is where **judges see the full picture**: CLI verified the exploit, now the dashboard explains what it means. Includes error states, empty states, and responsive design.

**Success Metric:** Dashboard loads in <2s, GitHub OAuth works, judges understand: "1 RCE CVE found = $4.9M breach risk if exploited."

---

## Critical Decisions (Locked)

| What | Decision | Why |
|------|----------|-----|
| Frontend Framework | React 18 + Vite (via Bun HTML imports, no separate build) | No extra build step. Bun handles bundling. |
| Styling | TailwindCSS + custom CSS | Fast, responsive, minimal overhead. |
| Authentication | GitHub OAuth (same token as CLI, stored in browser localStorage encrypted) | Single sign-on. Judges can log in with GitHub account. |
| Data Source | Read JSON from `~/.codeprobe/scans/{scan_id}.json` (S3 for production, local for MVP) | Stateless. No database needed. |
| Views | Technical view (default) + Business Impact callout | Executive view cut to save time. Focus on judges understanding the risk. |

---

## Deliverables

### 1. Dashboard Backend (REST API)
- [ ] `src/api/server.ts`:
  - Lightweight Bun.serve() REST API
  - Routes:
    ```
    GET  /api/scans             → list all scans
    GET  /api/scans/:scan_id    → get scan details (requires auth)
    POST /api/auth/github       → OAuth callback handler
    GET  /api/auth/logout       → clear session
    ```
  - Auth middleware: Check GitHub OAuth token in Authorization header
  - CORS: Allow localhost:5173 (Vite dev server)
  - Error handling: Return 401 if not authenticated, 404 if scan not found
  - **Test**: `curl -H "Authorization: Bearer {token}" http://localhost:3000/api/scans` returns list

### 2. GitHub OAuth Integration
- [ ] `src/api/auth.ts`:
  - GitHub OAuth app credentials (from environment: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
  - Flow:
    1. Frontend redirects to GitHub OAuth consent page
    2. User approves, GitHub redirects to `/api/auth/github?code=...`
    3. Backend exchanges code for token
    4. Return token to frontend (localStorage)
    5. Frontend includes token in all API requests
  - Token validation: Fetch `/user` endpoint from GitHub API to confirm token is valid
  - Error handling: Invalid code → "Authentication failed. Try again."
  - **Test**: `npm run dev` → click "Login with GitHub" → should work locally (pre-register GitHub OAuth app in settings)

### 3. React Dashboard Frontend
- [ ] `src/dashboard/index.tsx`:
  - Landing page: If not authenticated, show login button + explanation
    ```
    🔒 CodeProbe Dashboard
    Log in with GitHub to view your scan results.
    [Login with GitHub] button
    ```
  - Authenticated page: Show scans list (latest first)
  - **Test**: `npm run dev` → should load without errors

### 4. Scans List View
- [ ] `src/dashboard/pages/ScansListPage.tsx`:
  - Table: Scan ID | Repo | Risk Score | CVEs Found | Timestamp | View
  - Pagination: Show 10 per page (with "Load More" button if more available)
  - Sorting: By timestamp (newest first) by default
  - Filtering: By risk level (CRITICAL/HIGH/MEDIUM/LOW)
  - Error state: "Failed to load scans. Try refreshing."
  - Empty state: "No scans yet. Run `codeprobe scan` from CLI to create one."
  - **Test**: Should load list of scans from `~/.codeprobe/scans/`

### 5. Scan Detail View (Technical)
- [ ] `src/dashboard/pages/ScanDetailPage.tsx`:
  - Header:
    - Repo URL
    - Risk score gauge (visual 0–10 scale, color-coded)
    - Scan timestamp + duration
  - Summary box:
    ```
    Confirmed Exploitable: 1
    Theoretical Risk: 2
    Supply Chain Warnings: 0
    ```
  - CVE Table:
    ```
    | CVE ID | Package | Severity | Status | Patch | View PoC |
    | --- | --- | --- | --- | --- | --- |
    | CVE-2023-44487 | http2-server | HIGH | ✅ Confirmed | v1.0.1 | [View] |
    | CVE-2023-XXXXX | ... | MEDIUM | ⚠️ Theoretical | N/A | — |
    ```
  - Expandable CVE details (click row to expand):
    - CVSS score
    - Vulnerability description
    - Affected versions
    - Exploit evidence (stdout from sandbox)
    - Patch diff (unified format, with syntax highlighting)
  - Action buttons:
    - "Copy scan URL" (for sharing with team)
    - "Export as JSON"
    - "Export as PDF" (if time allows, otherwise skip)
  - Error state: "Failed to load scan details. Try again."
  - **Test**: Click on a CVE, should expand and show patch diff

### 6. Business Impact Display (Critical for Judges)
- [ ] `src/dashboard/components/BusinessImpactCard.tsx`:
  - Large, obvious callout box with:
    ```
    ⚠️ BUSINESS IMPACT
    
    This codebase contains 1 confirmed RCE vulnerability.
    
    If exploited → attacker can:
    • Execute arbitrary code on your server
    • Steal customer data
    • Hold your service ransom
    
    Average breach cost: $4.9M
    Your estimated risk: $4.9M
    
    Recommended: Patch within 24 hours
    ```
  - Color: Red background, white text (very obvious)
  - Data: Risk score × breach cost = estimated impact
  - Should be **above the fold** (visible without scrolling)
  - **Test**: Business impact displays correctly for demo CVE

### 7. Patch Diff Viewer
- [ ] `src/dashboard/components/PatchDiffViewer.tsx`:
  - Display unified diff with syntax highlighting
  - Library: Prism.js for code highlighting
  - Show:
    ```
    --- a/package.json
    +++ b/package.json
    @@ -5,1 +5,1 @@
    - "http2-server": "1.0.0"
    + "http2-server": "1.0.1"
    ```
  - Copy button: "Copy patch to clipboard"
  - Download button: "Download as .patch file"
  - **Test**: Click CVE row, patch diff should display

### 8. Error + Empty States
- [ ] `src/dashboard/components/ErrorBoundary.tsx`:
  - Catch all React errors, show friendly message
  - "Something went wrong. Refresh the page or contact support."
- [ ] Empty state (no scans):
  - "No scans yet"
  - Show CLI command: `codeprobe scan <repo>`
  - Link to docs
- [ ] Error state (failed to load scan):
  - "Failed to load scan. Try refreshing or running a new scan."
- [ ] 404 state (scan ID not found):
  - "Scan not found. It may have been deleted or the URL is incorrect."

### 9. Responsive Design + Mobile
- [ ] Mobile-first CSS:
  - Risk gauge stays visible on mobile
  - CVE table converts to card layout on small screens
  - Business impact always above fold
  - No horizontal scroll
- [ ] Test on:
  - Desktop (1920x1080)
  - Tablet (768x1024)
  - Mobile (375x667)
  - Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`)

### 10. Performance + Loading States
- [ ] Loading state while fetching scans:
  - Skeleton loaders (shimmer effect)
  - "Loading scans..."
- [ ] Optimizations:
  - Lazy-load scan details (don't load all CVE data until needed)
  - Memoize components to avoid re-renders
  - Code-split: Separate pages (list, detail) into chunks
- [ ] Target: Dashboard loads in <2s

### 11. Integration Tests
- [ ] `src/test/dashboard.test.ts`:
  ```ts
  test("Dashboard: Auth flow works", async () => {
    // Start local server
    // Navigate to dashboard
    // Click login
    // Should redirect to GitHub
    // Simulate OAuth callback
    // Should redirect back to dashboard
    // Should show scans list
  });

  test("Dashboard: Scan detail loads correctly", async () => {
    // Fetch scan from API
    // Verify risk score displays
    // Verify business impact visible
    // Verify CVE table shows data
    // Verify patch diff displays
  });
  ```

### 12. Pre-Record Fallback Video
- [ ] Record a 2-minute video:
  1. CLI scan running (0–1 min): Shows real-time progress, finds HTTP/2 CVE
  2. Dashboard loading (1–1:30 min): Shows risk score, business impact, patch diff
  3. Patch applied (1:30–2 min): Shows git branch created, code reviewed
- [ ] Save as `demo-fallback-video.mp4`
- [ ] Play if live demo fails (network issues, API down, etc.)

### 13. Demo Day Checklist
- [ ] Start demo server: `bun run src/api/server.ts`
- [ ] Start Vite dev server: `bun run dev`
- [ ] Dashboard accessible: http://localhost:5173
- [ ] OAuth login works (pre-test with your GitHub account)
- [ ] Recent scan visible in list
- [ ] Scan detail loads + shows business impact
- [ ] Patch diff displays correctly
- [ ] Performance: Dashboard loads in <2s
- [ ] Fallback video ready to play if needed

---

## Acceptance Criteria

✅ **Must Have:**
1. React dashboard loads without errors
2. GitHub OAuth login works (test with your account)
3. Scans list displays recent scans
4. Scan detail view shows:
   - Risk score gauge
   - CVE table with severity + status
   - Business impact callout ($4.9M)
   - Patch diff for confirmed CVEs
5. Error states defined (404, loading, network error)
6. Empty state clear ("No scans yet")
7. Dashboard loads in <2s
8. Responsive on mobile (verified visually)
9. `bun test` passes (integration tests)

✅ **Nice to Have:**
- PDF export
- Scan sharing (one-time link)
- Supply chain warning banner (red, obvious)
- Accessibility labels (ARIA)

---

## Known Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Vite build slow | Pre-compile before demo. Test build time locally. |
| GitHub OAuth fails live | Have backup: static demo scan loaded from JSON (no auth required). |
| Large scan results slow to load | Pagination: Load 10 CVEs at a time. Lazy-load details on click. |
| React error crashes dashboard | Error boundary catches errors, shows friendly message. |
| Judges can't find login button | Make login button very obvious, large, above fold. |
| Business impact not understood | Large, red callout box with dollar amount ($4.9M). Avoid jargon. |

---

## Setup Checklist

Before starting Stage 3:
- [ ] Stage 2 passing (`bun run src/cli/index.ts scan ./demo-vulnerable-app` works)
- [ ] Recent scan JSON exists: `~/.codeprobe/scans/latest.json`
- [ ] GitHub OAuth app registered: https://github.com/settings/developers
  - Client ID: set as `GITHUB_CLIENT_ID` env var
  - Client Secret: set as `GITHUB_CLIENT_SECRET` env var
  - Authorization callback URL: `http://localhost:3000/api/auth/github`
- [ ] TailwindCSS installed + configured
- [ ] Vite installed for frontend dev

---

## Deliverable Checklist

When Stage 3 is done:
- [ ] Push to branch: `stage-3-dashboard`
- [ ] Dashboard fully functional + deployed locally
- [ ] GitHub OAuth tested + working
- [ ] Demo rehearsal completed (3–5 times)
- [ ] Fallback video recorded + ready
- [ ] Create summary: "Stage 3 Complete: Dashboard functional, OAuth working, judges can see full results + business impact"
- [ ] Note any deviations: If PDF export cut, document why
- [ ] List remaining issues: Any bugs or missing features for post-hackathon

---

## Files to Create/Modify

```
NEW:
  src/api/server.ts
  src/api/auth.ts
  src/api/routes.ts
  src/dashboard/index.tsx
  src/dashboard/pages/ScansListPage.tsx
  src/dashboard/pages/ScanDetailPage.tsx
  src/dashboard/pages/LoginPage.tsx
  src/dashboard/components/RiskGauge.tsx
  src/dashboard/components/CVETable.tsx
  src/dashboard/components/BusinessImpactCard.tsx
  src/dashboard/components/PatchDiffViewer.tsx
  src/dashboard/components/ErrorBoundary.tsx
  src/dashboard/hooks/useAuth.ts
  src/dashboard/hooks/useScan.ts
  src/dashboard/index.html
  src/test/dashboard.test.ts
  tailwind.config.js
  demo-fallback-video.mp4 (recorded)

MODIFY:
  package.json (add dashboard scripts, dependencies)
  tsconfig.json (update paths for dashboard)
  src/api/server.ts (add routes)
```

---

## Timeline Breakdown (4–7 hours total)

**Hour 4 (0:00–1:00): API + Auth**
- Build REST API server
- Implement GitHub OAuth flow
- Test: `curl` to API, OAuth flow works

**Hour 5 (1:00–2:00): React Setup + List View**
- Set up React + Vite
- Scans list page
- Test: Dashboard loads, OAuth login works, scans list displays

**Hour 6 (2:00–3:00): Scan Detail + Business Impact**
- Scan detail page
- CVE table
- Business impact callout (CRITICAL: make it obvious)
- Test: Risk score, business impact visible

**Hour 6.5 (3:00–3:30): Patch Diff + Error States**
- Patch diff viewer
- Error + empty states
- Responsive design pass

**Hour 7+ (3:30–7:00): Polish + Testing + Demo Rehearsal**
- Fix bugs from integration testing
- Performance optimization
- Record fallback video
- Rehearse demo (3–5 times)
- Final UI polish (colors, spacing, typography)

---

**Next:** Demo day! All stages complete, judges see: CLI + exploit verification + dashboard + business impact.

---

## Post-Hackathon (Not in Scope)

If the team continues development:
- [ ] Executive view (simplified version for non-technical stakeholders)
- [ ] Supply chain attack monitoring
- [ ] GitHub bot PR comments
- [ ] CI/CD GitHub Action
- [ ] MCP server for Claude Desktop integration
- [ ] Database (replace local JSON)
- [ ] User accounts + team management
- [ ] Historical scan trends + reporting
