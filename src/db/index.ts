const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost/codeprobe";

let db: any = null;

export async function initDB() {
  try {
    const postgres = await import("postgres");
    db = postgres.default(DATABASE_URL);
    await db`SELECT 1`;
    console.log("✓ Database connected");

    // Auto-create tables if they don't exist
    await db`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        repository_url TEXT NOT NULL,
        branch TEXT,
        risk_score FLOAT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        summary JSONB,
        metadata JSONB
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS cves (
        id TEXT PRIMARY KEY,
        cve_id TEXT NOT NULL UNIQUE,
        description TEXT,
        severity TEXT,
        cvss_score FLOAT,
        published_date TIMESTAMP,
        data JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db`
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
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS patches (
        id TEXT PRIMARY KEY,
        finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
        cve_id TEXT NOT NULL,
        patch_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db`CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings(scan_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_findings_cve ON findings(cve_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_cves_severity ON cves(severity)`;

    console.log("✓ Schema initialized");
    return true;
  } catch (err) {
    console.error("✗ DB init failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

function getDb() {
  if (!db) throw new Error("DB not initialized. Call initDB() first.");
  return db;
}

// Scans
export async function saveScan(scan: any) {
  const { id, repository_url, branch, risk_score, timestamp, summary, metadata } = scan;
  const db = getDb();
  return await db`
    INSERT INTO scans (id, repository_url, branch, risk_score, timestamp, summary, metadata)
    VALUES (${id}, ${repository_url}, ${branch}, ${risk_score}, ${timestamp}, ${JSON.stringify(summary)}, ${JSON.stringify(metadata)})
    ON CONFLICT (id) DO UPDATE SET risk_score = ${risk_score}, summary = ${JSON.stringify(summary)}
    RETURNING *
  `;
}

export async function getScans() {
  const db = getDb();
  return await db`SELECT * FROM scans ORDER BY timestamp DESC LIMIT 100`;
}

export async function getScan(scanId: string) {
  const db = getDb();
  const result = await db`SELECT * FROM scans WHERE id = ${scanId}`;
  return result[0] || null;
}

// CVEs
export async function saveCVE(cve: any) {
  const { cve_id, description, severity, cvss_score, published_date, data } = cve;
  const db = getDb();
  return await db`
    INSERT INTO cves (cve_id, description, severity, cvss_score, published_date, data)
    VALUES (${cve_id}, ${description}, ${severity}, ${cvss_score}, ${published_date}, ${JSON.stringify(data)})
    ON CONFLICT (cve_id) DO UPDATE SET data = ${JSON.stringify(data)}, last_updated = CURRENT_TIMESTAMP
    RETURNING *
  `;
}

export async function getCVE(cveId: string) {
  const db = getDb();
  const result = await db`SELECT * FROM cves WHERE cve_id = ${cveId}`;
  return result[0] || null;
}

export async function searchCVEs(severity?: string) {
  const db = getDb();
  if (severity) {
    return await db`SELECT * FROM cves WHERE severity = ${severity} ORDER BY cvss_score DESC`;
  }
  return await db`SELECT * FROM cves ORDER BY cvss_score DESC LIMIT 100`;
}

// Findings
export async function addFinding(finding: any) {
  const { id, scan_id, cve_id, package_name, affected_versions, status, exploitable, patch } = finding;
  const db = getDb();
  return await db`
    INSERT INTO findings (id, scan_id, cve_id, package_name, affected_versions, status, exploitable, patch)
    VALUES (${id}, ${scan_id}, ${cve_id}, ${package_name}, ${affected_versions}, ${status}, ${exploitable}, ${JSON.stringify(patch)})
    ON CONFLICT (scan_id, cve_id, package_name) DO UPDATE SET
      status = ${status},
      exploitable = ${exploitable},
      patch = ${JSON.stringify(patch)}
    RETURNING *
  `;
}

export async function getFindings(scanId: string) {
  const db = getDb();
  return await db`SELECT * FROM findings WHERE scan_id = ${scanId} ORDER BY created_at DESC`;
}

// Patches
export async function savePatch(patch: any) {
  const { id, finding_id, cve_id, patch_content } = patch;
  const db = getDb();
  return await db`
    INSERT INTO patches (id, finding_id, cve_id, patch_content)
    VALUES (${id}, ${finding_id}, ${cve_id}, ${patch_content})
    ON CONFLICT (id) DO UPDATE SET patch_content = ${patch_content}
    RETURNING *
  `;
}

export async function getPatch(findingId: string) {
  const db = getDb();
  const result = await db`SELECT * FROM patches WHERE finding_id = ${findingId}`;
  return result[0] || null;
}

// Stats
export async function getStats() {
  const db = getDb();
  const scans = await db`SELECT COUNT(*) as count FROM scans`;
  const cves = await db`SELECT COUNT(*) as count FROM cves`;
  const findings = await db`SELECT COUNT(*) as count FROM findings WHERE exploitable = true`;

  return {
    total_scans: scans[0]?.count || 0,
    total_cves: cves[0]?.count || 0,
    exploitable_findings: findings[0]?.count || 0,
  };
}
