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
    if (depth > 5) return; // Prevent deep recursion

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
      // Permission denied or other errors
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
      });
    } catch {
      // File read error
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
    const sqlPatterns = [
      /query\s*\(\s*[`'"]\s*SELECT.*?\$\{/i,
      /execute\s*\(\s*[`'"]\s*SELECT.*?\$\{/i,
      /sql\s*`\s*SELECT.*?\$\{/i,
      /db\s*\.\s*query\s*\(\s*[`'"][^`'"]*\+/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `SQL-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "SQL Injection",
          description: "Potential SQL injection vulnerability detected",
          code: line.trim(),
          suggestion:
            "Use parameterized queries or prepared statements instead of string concatenation",
        });
        break;
      }
    }
  }

  private checkForCommandInjection(line: string, file: string, lineNum: number): void {
    // Skip if using proper escaping functions
    if (line.includes('escapeShellArg') || line.includes('quote') || line.includes('shellEscape')) {
      return;
    }

    const cmdPatterns = [
      /exec\s*\(\s*[`'"]\s*[^`'"]*\$\{[^}]*\}/i,
      /execSync\s*\(\s*[`'"]\s*[^`'"]*\$\{[^}]*\}/i,
      /spawn\s*\(\s*[`'"]\s*[^`'"]*\+/i,
      /shell:\s*true/,
    ];

    for (const pattern of cmdPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `CMD-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "CRITICAL",
          type: "Command Injection",
          description: "Potential command injection vulnerability detected",
          code: line.trim(),
          suggestion:
            "Avoid using shell=true and never pass user input to exec/spawn without sanitization",
        });
        break;
      }
    }
  }

  private checkForInsecureEval(line: string, file: string, lineNum: number): void {
    // Skip if this is a comment or string literal describing the vulnerability
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.includes('description:') || line.includes('suggestion:')) {
      return;
    }

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
    // Skip if this is a comment or string literal describing the vulnerability
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.includes('description:') || line.includes('suggestion:')) {
      return;
    }

    const xssPatterns = [
      /innerHTML\s*=\s*[^`'"]*\$\{/i,
      /innerHTML\s*=\s*[^`'"]*\+/i,
      /dangerouslySetInnerHTML\s*=\s*[^}]*}/,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `XSS-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "HIGH",
          type: "Cross-Site Scripting (XSS)",
          description: "Potential XSS vulnerability through innerHTML or dangerouslySetInnerHTML",
          code: line.trim(),
          suggestion:
            "Use textContent instead of innerHTML, or sanitize user input before rendering. For React, use a library like DOMPurify",
        });
        break;
      }
    }
  }

  private checkForPathTraversal(line: string, file: string, lineNum: number): void {
    const pathPatterns = [
      /fs\.readFile\s*\(\s*[^,]*req\./i,
      /path\.join\s*\(\s*[^,]*req\./i,
      /fs\.readFileSync\s*\(\s*[^,]*req\./i,
      /readFile\s*\(\s*\.\.\//,
    ];

    for (const pattern of pathPatterns) {
      if (pattern.test(line)) {
        this.addVulnerability({
          id: `PATH-${file}-${lineNum}`,
          file,
          line: lineNum,
          severity: "HIGH",
          type: "Path Traversal",
          description: "Potential path traversal vulnerability detected",
          code: line.trim(),
          suggestion:
            "Validate and sanitize file paths. Use path.normalize() and ensure the path is within the allowed directory",
        });
        break;
      }
    }
  }

  private checkForInsecureRandom(line: string, file: string, lineNum: number): void {
    // Skip if this is for timing delays (non-security critical)
    if (
      /[Tt]ime/.test(line) ||
      line.includes('delay') ||
      line.includes('timeout') ||
      line.includes('* 1000') ||
      line.includes('* 2000')
    ) {
      return;
    }

    // Skip if this is a comment or string literal
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.includes('description:') || line.includes('suggestion:')) {
      return;
    }

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
          "Use crypto.getRandomBytes() or crypto.randomUUID() for security-sensitive operations",
      });
    }
  }

  private addVulnerability(vuln: CodeVulnerability): void {
    if (!this.vulnerabilities.find((v) => v.id === vuln.id)) {
      this.vulnerabilities.push(vuln);
    }
  }
}

export const createSASTScanner = () => new SASTScanner();
