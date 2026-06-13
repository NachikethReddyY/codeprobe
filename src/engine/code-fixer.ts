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

    // Group vulnerabilities by file
    const vulnsByFile = new Map<string, CodeVulnerability[]>();
    for (const vuln of vulnerabilities) {
      if (!vulnsByFile.has(vuln.file)) {
        vulnsByFile.set(vuln.file, []);
      }
      vulnsByFile.get(vuln.file)!.push(vuln);
    }

    // Process each file
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

        // Write back if modified
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
        return { original, fixed };
      }
    } catch (error) {
      // Silent fail for individual fixes
    }

    return null;
  }

  private fixHardcodedSecret(line: string): string {
    // Replace hardcoded values with environment variable references
    let fixed = line;

    // Replace apiKey/api_key patterns
    if (/api_?key\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "apiKey";
      fixed = fixed.replace(/api_?key\s*[:=]\s*["'][^"']*["']/i,
        `${varName} = process.env.API_KEY || ""`);
    }

    // Replace password patterns
    if (/password\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "password";
      fixed = fixed.replace(/password\s*[:=]\s*["'][^"']*["']/i,
        `${varName} = process.env.PASSWORD || ""`);
    }

    // Replace token patterns
    if (/token\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "token";
      fixed = fixed.replace(/token\s*[:=]\s*["'][^"']*["']/i,
        `${varName} = process.env.TOKEN || ""`);
    }

    // Replace secret patterns
    if (/secret\s*[:=]\s*["']/i.test(fixed)) {
      const varName = fixed.match(/(\w+)\s*[:=]/)?.[1] || "secret";
      fixed = fixed.replace(/secret\s*[:=]\s*["'][^"']*["']/i,
        `${varName} = process.env.SECRET || ""`);
    }

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

}

export const createCodeFixer = () => new CodeFixer();
