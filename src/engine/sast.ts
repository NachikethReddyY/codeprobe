import { readdir, readFile } from "fs/promises";
import { join } from "path";

export interface CodeVulnerability {
  id: string;
  file: string;
  line: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  type: string;
  description: string;
  code: string;
  suggestion: string;
}

export class SASTScanner {
  private vulnerabilities: CodeVulnerability[] = [];

  async scanRepository(rootPath: string): Promise<CodeVulnerability[]> {
    this.vulnerabilities = [];
    await this.scanDirectory(rootPath);
    return this.vulnerabilities;
  }

  private async scanDirectory(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > 5) return;

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

        const fullPath = join(dirPath, entry.name);

        if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
          await this.scanFile(fullPath);
        } else if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, depth + 1);
        }
      }
    } catch {
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        this.checkForHardcodedSecrets(line, filePath, index + 1);
        this.checkForSQLInjection(line, filePath, index + 1);
        this.checkForCommandInjection(line, filePath, index + 1);
        this.checkForInsecureEval(line, filePath, index + 1);
        this.checkForXSSVulnerabilities(line, filePath, index + 1);
        this.checkForPathTraversal(line, filePath, index + 1);
        this.checkForInsecureRandom(line, filePath, index + 1);
        this.checkForWeakCrypto(line, filePath, index + 1);
        this.checkForPrototypePollution(line, filePath, index + 1);
        this.checkForHardcodedBearerToken(line, filePath, index + 1);
        this.checkForDeprecatedBuffer(line, filePath, index + 1);
        this.checkForInsecureCORS(line, filePath, index + 1);
        this.checkForInsecureSession(line, filePath, index + 1);
        this.checkForJWTAdminBypass(line, filePath, index + 1);
      });
    } catch {
    }
  }

  private checkForHardcodedSecrets(line: string, file: string, lineNum: number): void {
    const secretPatterns = [
      /(?:api_?key|apiKey|api_secret|secret)\s*[:=]\s*["'][^"']*["']/i,
      /(?:password|passwd)\s*[:=]\s*["'][^"']*["']/i,
      /(?:token|auth|bearer)\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i,
      /(?:private_key|privateKey)\s*[:=]/i,
      /(?:database_url|db_url|dburl)\s*[:=]\s*["'].*?(?:password|pwd)=/i,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `SECRET-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "Hardcoded Secret",
          description: "Hardcoded credentials or secrets detected in source code",
          code: line.trim(),
          suggestion:
            "Move secrets to environment variables or use a secrets management tool like dotenv",
        });
        break;
      }
    }
  }

  private checkForSQLInjection(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const sqlPatterns = [
      // Template literal SQL with interpolation
      /query\s*\(\s*[`'"]\s*SELECT.*?\$\{/i,
      /execute\s*\(\s*[`'"]\s*SELECT.*?\$\{/i,
      /sql\s*`\s*SELECT.*?\$\{/i,
      // String concatenation in SQL queries
      /query\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      /execute\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      /db\.\s*query\s*\(\s*["'`][^"'`]*["'`]\s*\+/i,
      // Raw string building with + for SQL
      /['"`]\s*SELECT\s.+?FROM\s.+?['"`]\s*\+/i,
      /['"`]\s*INSERT\s.+?INTO\s.+?['"`]\s*\+/i,
      /['"`]\s*UPDATE\s.+?SET\s.+?['"`]\s*\+/i,
      /['"`]\s*DELETE\s.+?FROM\s.+?['"`]\s*\+/i,
      // Template literal SQL (any statement)
      /`\s*SELECT\s.+?\$\{/i,
      /`\s*INSERT\s.+?\$\{/i,
      /`\s*UPDATE\s.+?\$\{/i,
      /`\s*DELETE\s.+?\$\{/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `SQL-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "SQL Injection",
          description: "Potential SQL injection vulnerability — string concatenation or interpolation in SQL query",
          code: line.trim(),
          suggestion:
            "Use parameterized queries or prepared statements instead of string concatenation. For mysql2: `connection.query('SELECT * FROM users WHERE id = ?', [userId])`",
        });
        break;
      }
    }
  }

  private checkForCommandInjection(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    if (line.includes('escapeShellArg') || line.includes('quote') || line.includes('shellEscape')) {
      return;
    }

    const cmdPatterns = [
      // Template literal in exec/execSync
      /exec\s*\(\s*[`'"]\s*[^`'"]*\$\{[^}]*\}/i,
      /execSync\s*\(\s*[`'"]\s*[^`'"]*\$\{[^}]*\}/i,
      // exec/execSync with string concatenation
      /exec\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      /execSync\s*\(\s*['"`][^'"`]*['"`]\s*\+/i,
      // spawn with string concat or shell:true
      /spawn\s*\(\s*[`'"]\s*[^`'"]*\+/i,
      /shell:\s*true/,
      // require('child_process').exec(...)
      /require\s*\(\s*['"]child_process['"]\s*\)\s*\.\s*exec\s*\(/i,
      /child_process\s*\.\s*exec\s*\(/i,
      // execFile/spawn with user-controlled input
      /execFile\s*\(\s*["'`][^"'`]*["'`]\s*,\s*\[?[^\]\)]*req\./i,
    ];

    for (const pattern of cmdPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `CMD-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "Command Injection",
          description: "Potential command injection — user input passed to shell command without sanitization",
          code: line.trim(),
          suggestion:
            "Avoid shell=true and never pass user input to exec/spawn without sanitization. Use `spawn` with arguments array instead of shell string.",
        });
        break;
      }
    }
  }

  private checkForInsecureEval(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const evalPatterns = [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\(\s*["'`].*?["'`]/,
      /setInterval\s*\(\s*["'`].*?["'`]/,
    ];

    for (const pattern of evalPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `EVAL-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "HIGH",
          type: "Insecure Eval",
          description: "Using eval() or Function() constructor with untrusted input is dangerous",
          code: line.trim(),
          suggestion: "Avoid eval() and Function() constructor. Use safer alternatives like JSON.parse()",
        });
        break;
      }
    }
  }

  private checkForXSSVulnerabilities(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const xssPatterns = [
      // React dangerouslySetInnerHTML
      /innerHTML\s*=\s*[^`'"]*\$\{/i,
      /innerHTML\s*=\s*[^`'"]*\+/i,
      /dangerouslySetInnerHTML\s*=/,
      // Express: sending unsanitized user input to response
      /res\.send\s*\(\s*req\./i,
      /res\.json\s*\(\s*req\./i,
      /response\.send\s*\(\s*req\./i,
      /res\.render\s*\(\s*req\./i,
      // Browser-side XSS
      /document\.write\s*\(\s*req\./i,
      /document\.write\s*\(\s*window\./i,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `XSS-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "HIGH",
          type: "Cross-Site Scripting (XSS)",
          description: "Potential XSS vulnerability — unsanitized user input sent to response or DOM",
          code: line.trim(),
          suggestion:
            "Sanitize user input before rendering. Use DOMPurify, escape HTML entities, or use templating engines with auto-escaping. For Express responses, set proper Content-Type and escape output.",
        });
        break;
      }
    }
  }

  private checkForPathTraversal(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const pathPatterns = [
      // Direct user input to file operations
      /fs\.readFile\s*\(\s*[^,]*req\./i,
      /fs\.readFileSync\s*\(\s*[^,]*req\./i,
      /fs\.writeFile\s*\(\s*[^,]*req\./i,
      /fs\.writeFileSync\s*\(\s*[^,]*req\./i,
      /createReadStream\s*\(\s*[^,]*req\./i,
      /createWriteStream\s*\(\s*[^,]*req\./i,
      // path.join with user input
      /path\.join\s*\(\s*[^,]*req\./i,
      /join\s*\(\s*[^,]*req\./i,
      // Directory traversal in file path
      /readFile\s*\(\s*\.\.\//,
      /readFileSync\s*\(\s*\.\.\//,
      /\.\.\/.*req\./i,
      /req\.params\s*.*\/\//i,
    ];

    for (const pattern of pathPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `PATH-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "HIGH",
          type: "Path Traversal",
          description: "Potential path traversal — user-controlled value used in file system operation",
          code: line.trim(),
          suggestion:
            "Validate and sanitize file paths. Use path.resolve() + check result stays within allowed directory. Never pass user input directly to file system APIs.",
        });
        break;
      }
    }
  }

  private checkForInsecureRandom(line: string, file: string, lineNum: number): void {
    if (
      /[Tt]ime/.test(line) ||
      line.includes('delay') ||
      line.includes('timeout') ||
      line.includes('* 1000') ||
      line.includes('* 2000')
    ) {
      return;
    }

    if (this.isCommentOrMeta(line)) return;

    if (/Math\.random\s*\(\)/.test(line)) {
      this.addVulnerability({
        id: `RAND-${file}-${lineNum}`,
        file,
        line: lineNum,
        severity: "MEDIUM",
        type: "Insecure Random",
        description: "Math.random() is not cryptographically secure",
        code: line.trim(),
        suggestion:
          "Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive operations like token generation",
      });
    }
  }

  private checkForWeakCrypto(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const weakCryptoPatterns = [
      // crypto-js MD5
      /CryptoJS\.MD5\s*\(/i,
      /crypto-js.*MD5/i,
      /require\s*\(\s*['"]crypto-js['"]\s*\)/i,
      // Node crypto MD5/SHA1
      /createHash\s*\(\s*['"]md5['"]\s*\)/i,
      /createHash\s*\(\s*['"]sha1['"]\s*\)/i,
      // MD5 in any form
      /\.md5\s*\(/i,
    ];

    for (const pattern of weakCryptoPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `WEAKCRYPTO-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "MEDIUM",
          type: "Weak Cryptography",
          description: "Use of weak cryptographic algorithm (MD5/SHA1) detected",
          code: line.trim(),
          suggestion:
            "Use SHA-256 or stronger. Node has built-in crypto: `crypto.createHash('sha256').update(data).digest('hex')`",
        });
        break;
      }
    }
  }

  private checkForPrototypePollution(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const ppPatterns = [
      // _.extend / _.merge with user input
      /_\.extend\s*\(\s*[^,]+,\s*req\./i,
      /_\.merge\s*\(\s*[^,]+,\s*req\./i,
      /_\.extend\s*\(\s*[^,]+,\s*body/i,
      /_\.merge\s*\(\s*[^,]+,\s*body/i,
      // Object.assign with user input
      /Object\.assign\s*\(\s*[^,]+,\s*req\./i,
      /Object\.assign\s*\(\s*[^,]+,\s*body/i,
      // Direct property assignment from user input
      /\[req\./i,
    ];

    for (const pattern of ppPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `PP-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "HIGH",
          type: "Prototype Pollution",
          description: "Potential prototype pollution — merging user-controlled input into objects",
          code: line.trim(),
          suggestion:
            "Avoid merging user input directly. Use defensive copy with Object.create(null) or libraries that guard against __proto__ pollution.",
        });
        break;
      }
    }
  }

  private checkForHardcodedBearerToken(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    // Match hardcoded Bearer token or Authorization header with static value
    const bearerPatterns = [
      /['"]Bearer\s+[A-Za-z0-9\-._~+/]{10,}['"]/,
      /['"]authorization['"]\s*[:=]\s*['"]Bearer\s+/i,
      /headers\[['"]authorization['"]\]\s*=\s*['"]Bearer\s+/i,
      /setHeader\s*\(\s*['"]Authorization['"]\s*,\s*['"]Bearer\s+/i,
    ];

    for (const pattern of bearerPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `TOKEN-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "Hardcoded Bearer Token",
          description: "Hardcoded bearer token or static Authorization header detected",
          code: line.trim(),
          suggestion:
            "Never hardcode tokens. Use environment variables or a secrets manager. Tokens should be unique per-user and rotated regularly.",
        });
        break;
      }
    }
  }

  private checkForDeprecatedBuffer(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    if (/new\s+Buffer\s*\(/.test(line)) {
      this.addVulnerability({
        id: `BUF-${file}-${lineNum}`,
        file,
        line: lineNum,
        severity: "MEDIUM",
        type: "Deprecated Buffer API",
        description: "Using deprecated `new Buffer()` constructor — removed in Node.js v16+",
        code: line.trim(),
        suggestion:
          "Use `Buffer.from()` or `Buffer.alloc()` instead of `new Buffer()`",
      });
    }
  }

  private checkForInsecureCORS(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const corsPatterns = [
      /['"]Access-Control-Allow-Origin['"]\s*[,:]\s*['"]\*['"]/i,
      /origin\s*:\s*['"]\*['"]/i,
      /allowOrigins\s*:\s*\[?\s*['"]\*['"]/i,
      /cors\s*\(\s*\{\s*origin\s*:\s*true\s*\}/i,
    ];

    for (const pattern of corsPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `CORS-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "MEDIUM",
          type: "Insecure CORS Configuration",
          description: "CORS configured with wildcard origin — allows any website to make cross-origin requests",
          code: line.trim(),
          suggestion:
            "Restrict CORS to specific origins instead of using `*`. Specify the exact allowed origins for your application.",
        });
        break;
      }
    }
  }

  private checkForInsecureSession(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const sessionPatterns = [
      /saveUninitialized\s*:\s*true/i,
      /resave\s*:\s*true/i,
    ];

    for (const pattern of sessionPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `SESS-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "MEDIUM",
          type: "Insecure Session Configuration",
          description: "Session configured with insecure options (saveUninitialized or resave enabled)",
          code: line.trim(),
          suggestion:
            "Set `saveUninitialized: false` and `resave: false` for better session security",
        });
        break;
      }
    }
  }

  private checkForJWTAdminBypass(line: string, file: string, lineNum: number): void {
    if (this.isCommentOrMeta(line)) return;

    const jwtPatterns = [
      // Always setting admin/role hardcoded in JWT
      /['"]admin['"]\s*:\s*true/i,
      /['"]role['"]\s*:\s*['"]admin['"]/i,
      // JWT sign with hardcoded payload
      /jwt\.sign\s*\(\s*\{\s*[^}]*admin[^}]*\}\s*,/i,
      /jwt\.sign\s*\(\s*\{\s*[^}]*role[^}]*\}\s*,/i,
    ];

    for (const pattern of jwtPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `JWT-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "JWT Admin Privilege Escalation",
          description: "JWT payload hardcodes admin/role claims — every token gets elevated privileges",
          code: line.trim(),
          suggestion:
            "Do not hardcode admin/role claims in JWT payloads. Set claims based on authenticated user's actual permissions from the database.",
        });
        break;
      }
    }
  }

  private isCommentOrMeta(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("*") ||
           line.includes('description:') || line.includes('suggestion:') ||
           line.includes('vulnerabilities') && line.includes("detected");
  }

  private addVulnerability(vuln: CodeVulnerability): void {
    if (!this.vulnerabilities.find((v) => v.id === vuln.id)) {
      this.vulnerabilities.push(vuln);
    }
  }
}

export const createSASTScanner = () => new SASTScanner();
