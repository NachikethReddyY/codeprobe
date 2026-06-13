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

    for (const vuln of vulnerabilities) {
      const fix = await this.generateFix(vuln);
      if (fix) {
        fixes.push(fix);
        await this.applyFix(fix);
      }
    }

    return fixes;
  }

  private async generateFix(vuln: CodeVulnerability): Promise<CodeFix | null> {
    try {
      const file = await readFile(vuln.file, "utf-8");
      const lines = file.split("\n");
      const lineIndex = vuln.line - 1;

      if (lineIndex < 0 || lineIndex >= lines.length) {
        return null;
      }

      const original = lines[lineIndex];
      let fixed = original;

      // Apply type-specific fixes
      if (vuln.type === "Hardcoded Secret") {
        fixed = this.fixHardcodedSecret(original);
      } else if (vuln.type === "Command Injection") {
        fixed = this.fixCommandInjection(original);
      } else if (vuln.type === "Insecure Random") {
        fixed = this.fixInsecureRandom(original);
      } else if (vuln.type === "SQL Injection") {
        fixed = this.fixSQLInjection(original);
      } else if (vuln.type === "Cross-Site Scripting (XSS)") {
        fixed = this.fixXSS(original);
      }

      if (fixed !== original) {
        return {
          file: vuln.file,
          line: vuln.line,
          original,
          fixed,
          type: vuln.type,
        };
      }
    } catch (error) {
      console.warn(`Failed to generate fix for ${vuln.file}:${vuln.line}`);
    }

    return null;
  }

  private fixHardcodedSecret(line: string): string {
    // Replace hardcoded values with environment variable references
    let fixed = line;

    // Replace apiKey/api_key patterns
    fixed = fixed.replace(/api_?key\s*[:=]\s*["'][^"']*["']/i, (match) => {
      const key = match.split("=")[0].trim();
      return `${key} = process.env.API_KEY || "${match.split('"')[1] || match.split("'")[1] || "YOUR_KEY_HERE"}"`;
    });

    // Replace password patterns
    fixed = fixed.replace(/password\s*[:=]\s*["'][^"']*["']/i, (match) => {
      const key = match.split("=")[0].trim();
      return `${key} = process.env.PASSWORD || ""`;
    });

    // Replace token patterns
    fixed = fixed.replace(/token\s*[:=]\s*["'][^"']*["']/i, (match) => {
      const key = match.split("=")[0].trim();
      return `${key} = process.env.TOKEN || ""`;
    });

    return fixed;
  }

  private fixCommandInjection(line: string): string {
    // Add escapeShellArg wrapper for unescaped variables
    if (line.includes("execSync") || line.includes("exec")) {
      return line.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        if (!line.includes("escapeShellArg")) {
          return `\${escapeShellArg(${varName})}`;
        }
        return match;
      });
    }
    return line;
  }

  private fixInsecureRandom(line: string): string {
    // Replace Math.random with crypto.randomBytes
    if (line.includes("Math.random()")) {
      return line.replace(/Math\.random\(\)\.toString\(\d+\)\.slice\([^)]+\)/g, 'randomBytes(4).toString("hex")');
    }
    return line;
  }

  private fixSQLInjection(line: string): string {
    // Suggest parameterized queries (manual fix needed)
    if (line.includes("query") && line.includes("$")) {
      return line.replace(/query\s*\([^)]*\$\{[^}]+\}[^)]*\)/, "query('...', [param1, param2])");
    }
    return line;
  }

  private fixXSS(line: string): string {
    // Replace innerHTML with textContent
    if (line.includes("innerHTML")) {
      return line.replace(/\.innerHTML\s*=/, ".textContent =");
    }

    // Replace dangerouslySetInnerHTML with safe alternative
    if (line.includes("dangerouslySetInnerHTML")) {
      return line.replace(/dangerouslySetInnerHTML=\{[^}]+\}/g, "children");
    }

    return line;
  }

  private async applyFix(fix: CodeFix): Promise<void> {
    try {
      const file = await readFile(fix.file, "utf-8");
      const lines = file.split("\n");
      lines[fix.line - 1] = fix.fixed;
      const updated = lines.join("\n");
      await writeFile(fix.file, updated, "utf-8");
    } catch (error) {
      console.warn(`Failed to apply fix to ${fix.file}:${fix.line}`);
    }
  }
}

export const createCodeFixer = () => new CodeFixer();
