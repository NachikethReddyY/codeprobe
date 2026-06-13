# Database Setup Guide

## ⚠️ Security First

**NEVER commit passwords to git!** Use environment variables instead.

## Database Users (Set as Environment Variables)

Create these on your database server (MySQL/PostgreSQL):

```bash
# Set these as env vars, not in code:
DB_ROOT_USER=codeprobeadmin
DB_ROOT_PASSWORD=codeprobeisthebest123

DB_APP_USER=user
DB_APP_PASSWORD=user
```

In `.env` file:
```
DB_ROOT_USER=codeprobeadmin
DB_ROOT_PASSWORD=codeprobeisthebest123
DB_APP_USER=user
DB_APP_PASSWORD=user
```

## Setup Instructions

### Step 1: Create Database

```sql
CREATE DATABASE codeprobe;
USE codeprobe;
```

### Step 2: Create Tables

```sql
-- Vulnerabilities table
CREATE TABLE vulnerabilities (
  id VARCHAR(50) PRIMARY KEY,
  package VARCHAR(100) NOT NULL,
  affected_versions JSON,
  fixed_version VARCHAR(50),
  severity VARCHAR(20),
  cvss FLOAT,
  description TEXT,
  cwe VARCHAR(50),
  exploit_url VARCHAR(255),
  source VARCHAR(50),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exploitable BOOLEAN DEFAULT FALSE,
  video_link VARCHAR(255),
  INDEX idx_package (package),
  INDEX idx_severity (severity)
);

-- Scans table
CREATE TABLE scans (
  id VARCHAR(50) PRIMARY KEY,
  repo_path VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vulnerabilities JSON,
  risk_score FLOAT,
  status VARCHAR(20),
  pr_link VARCHAR(255),
  INDEX idx_timestamp (timestamp)
);

-- Web scraper results (hourly)
CREATE TABLE web_scrape_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cves_found INT,
  cves_updated INT,
  status VARCHAR(20),
  error_message TEXT,
  INDEX idx_scan_date (scan_date)
);
```

### Step 3: Create Application User

```sql
-- Create user with limited privileges
CREATE USER 'user'@'localhost' IDENTIFIED BY 'user';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON codeprobe.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Connection String

For Node.js application:

```javascript
// src/db/connection.ts
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_APP_USER,
  password: process.env.DB_APP_PASSWORD,
  database: 'codeprobe',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

## Initial Data

Seed initial CVEs:

```sql
INSERT INTO vulnerabilities VALUES
('CVE-2022-29078', 'ejs', '["3.1.0","3.1.1","3.1.2","3.1.3","3.1.4","3.1.5","3.1.6"]', '3.1.7', 'CRITICAL', 9.8, 'Template injection RCE', 'CWE-94', 'https://nvd.nist.gov/vuln/detail/CVE-2022-29078', 'nvd', NOW(), true, NULL),
('CVE-2023-44487', 'http2', '["0.0.1"]', '1.0.0', 'HIGH', 7.5, 'HTTP/2 Rapid Reset DoS', 'CWE-400', 'https://nvd.nist.gov/vuln/detail/CVE-2023-44487', 'nvd', NOW(), true, NULL);
```

## Environment Variables

Add to `.env`:

```
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=codeprobe
DB_APP_USER=user
DB_APP_PASSWORD=user
DB_ROOT_USER=codeprobeadmin
DB_ROOT_PASSWORD=codeprobeisthebest123
```

**IMPORTANT:**
- ✅ Add `.env` to `.gitignore`
- ✅ Never commit passwords
- ✅ Share only the `.env.example` in git
- ✅ Each machine gets its own `.env`

## Verification

```bash
# Test connection
mysql -h localhost -u user -p codeprobe -e "SELECT COUNT(*) FROM vulnerabilities;"
```

Expected: Should return row count with your CVEs.

## Backup

```bash
# Backup database
mysqldump -u codeprobeadmin -p codeprobe > backup.sql

# Restore from backup
mysql -u codeprobeadmin -p codeprobe < backup.sql
```

---

**Status**: Ready to use ✅
