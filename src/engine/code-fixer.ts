import { readFile, writeFile } from "fs/promises";
import { CodeVulnerability } from "./sast";

export interface CodeFix {
  file: string;
  line: number;
  original: string;
  fixed: string;
  type: string;
}

export class CodeFixer {
  async fixVulnerabilities(vulnerabilities: CodeVulnerability[]): Promise<CodeFix[]> {
    const fixes: CodeFix[] = [];
    const fileCache = new Map<string, { original: string; lines: string[] }>();

    const vulnsByFile = new Map<string, CodeVulnerability[]>();
    for (const vuln of vulnerabilities) {
      if (!vulnsByFile.has(vuln.file)) {
        vulnsByFile.set(vuln.file, []);
      }
      vulnsByFile.get(vuln.file)!.push(vuln);
    }

    for (const [filePath, fileVulns] of vulnsByFile) {
      try {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n");
        let modified = false;

        for (const vuln of fileVulns) {
          const fix = this.generateFixForVulnerability(vuln, lines);
          if (fix) {
            lines[vuln.line - 1] = fix.fixed;
            fixes.push({ file: filePath, line: vuln.line, original: fix.original, fixed: fix.fixed, type: vuln.type });
            modified = true;
          }
        }

        if (modified) {
          const updatedContent = lines.join("\n");
          await writeFile(filePath, updatedContent, "utf-8");
          console.log(`   ✓ Fixed ${fileVulns.length} issues in ${filePath}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to fix ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return fixes;
  }

  private generateFixForVulnerability(vuln: CodeVulnerability, lines: string[]): { original: string; fixed: string } | null {
    try {
      const lineIndex = vuln.line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) {
        return null;
      }

      const original = lines[lineIndex];
      let fixed = original;

      if (vuln.type === "Hardcoded Secret") {
        fixed = this.fixHardcodedSecret(original);
      } else if (vuln.type === "Command Injection") {
        fixed = this.fixCommandInjection(original);
      } else if (vuln.type === "Insecure Random") {
        fixed = this.fixInsecureRandom(original);
      } else if (vuln.type === "Cross-Site Scripting (XSS)") {
        fixed = this.fixXSS(original);
      } else if (vuln.type === "Deprecated Buffer API") {
        fixed = this.fixDeprecatedBuffer(original);
      } else if (vuln.type === "Insecure CORS Configuration") {
        fixed = this.fixInsecureCORS(original);
      } else if (vuln.type === "Insecure Session Configuration") {
        fixed = this.fixInsecureSession(original);
      }

      if (fixed !== original) {
        return { original, fixed };
      }
    } catch {
    }

    return null;
  }

  private fixHardcodedSecret(line: string): string {
    let fixed = line;

    if (/api_?key\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "API_KEY";
      const envName = varName.replace(/['"]/g, '').toUpperCase();
      fixed = fixed.replace(
        /(\w+)\s*[:=]\s*["'][^"']*["']/,
        `$1 = process.env.${envName} || ""`
      );
    }

    if (/password\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "PASSWORD";
      const envName = varName.replace(/['"]/g, '').toUpperCase();
      fixed = fixed.replace(
        /(\w+)\s*[:=]\s*["'][^"']*["']/,
        `$1 = process.env.${envName} || ""`
      );
    }

    if (/token\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "TOKEN";
      const envName = varName.replace(/['"]/g, '').toUpperCase();
      fixed = fixed.replace(
        /(\w+)\s*[:=]\s*["'][^"']*["']/,
        `$1 = process.env.${envName} || ""`
      );
    }

    if (/secret\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "SECRET";
      const envName = varName.replace(/['"]/g, '').toUpperCase();
      fixed = fixed.replace(
        /(\w+)\s*[:=]\s*["'][^"']*["']/,
        `$1 = process.env.${envName} || ""`
      );
    }

    return fixed;
  }

  private fixCommandInjection(line: string): string {
    return line;
  }

  private fixInsecureRandom(line: string): string {
    if (line.includes("Math.random()")) {
      return line.replace(/Math\.random\(\)\.toString\(\d+\)\.slice\([^)]+\)/g, 'randomBytes(4).toString("hex")');
    }
    return line;
  }

  private fixXSS(line: string): string {
    if (line.includes("innerHTML")) {
      return line.replace(/\.innerHTML\s*=/, ".textContent =");
    }

    if (line.includes("dangerouslySetInnerHTML")) {
      return line.replace(/dangerouslySetInnerHTML=\{[^}]+\}/g, "children");
    }

    return line;
  }

  private fixDeprecatedBuffer(line: string): string {
    if (/new\s+Buffer\s*\(/.test(line)) {
      return line.replace(/new\s+Buffer\s*\(/, "Buffer.from(");
    }
    return line;
  }

  private fixInsecureCORS(line: string): string {
    let fixed = line;
    if (line.includes("*") && (line.includes("Access-Control-Allow-Origin") || line.includes("origin"))) {
      fixed = fixed.replace(/['"]\*['"]/, "process.env.ALLOWED_ORIGIN || 'http://localhost:3000'");
    }
    return fixed;
  }

  private fixInsecureSession(line: string): string {
    let fixed = line;
    if (line.includes("saveUninitialized: true")) {
      fixed = fixed.replace(/saveUninitialized:\s*true/, "saveUninitialized: false");
    }
    if (line.includes("resave: true")) {
      fixed = fixed.replace(/resave:\s*true/, "resave: false");
    }
    return fixed;
  }
}

export const createCodeFixer = () => new CodeFixer();
