-- Scans table: stores vulnerability scan results
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  repository_url TEXT NOT NULL,
  branch TEXT,
  risk_score FLOAT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  summary JSONB,
  metadata JSONB
);

-- CVEs table: stores known CVE data (cached from searches)
CREATE TABLE IF NOT EXISTS cves (
  id TEXT PRIMARY KEY,
  cve_id TEXT NOT NULL UNIQUE,
  description TEXT,
  severity TEXT,
  cvss_score FLOAT,
  published_date TIMESTAMP,
  data JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Findings table: CVEs found in scans (many-to-many)
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  cve_id TEXT NOT NULL REFERENCES cves(cve_id),
  package_name TEXT NOT NULL,
  affected_versions TEXT,
  status TEXT,
  exploitable BOOLEAN,
  patch_available BOOLEAN,
  patch JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scan_id, cve_id, package_name)
);

-- Patches table: patch diffs for confirmed vulnerabilities
CREATE TABLE IF NOT EXISTS patches (
  id TEXT PRIMARY KEY,
  finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  cve_id TEXT NOT NULL,
  patch_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_cve ON findings(cve_id);
CREATE INDEX IF NOT EXISTS idx_cves_severity ON cves(severity);
