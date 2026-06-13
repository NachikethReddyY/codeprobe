import { createEngine } from "../engine/index.js";
import { PATHS } from "../shared/constants.js";
import { readFile } from "fs/promises";
import path from "path";

interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: Record<string, unknown> | string | boolean;
  error?: { code: number; message: string };
}

const activeScan: Map<string, { status: string; progress: number }> = new Map();

async function handleToolCall(method: string, params?: Record<string, unknown>): Promise<unknown> {
  const engine = createEngine();

  switch (method) {
    case "scan_repository": {
      const repoUrl = params?.repo_url as string;
      const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      activeScan.set(scanId, { status: "running", progress: 0 });

      // Run scan asynchronously
      setTimeout(async () => {
        try {
          await engine.scan(repoUrl);
          activeScan.set(scanId, { status: "complete", progress: 100 });
        } catch (error) {
          activeScan.set(scanId, { status: "failed", progress: 0 });
        }
      }, 0);

      return { scan_id: scanId };
    }

    case "get_scan_status": {
      const scanId = params?.scan_id as string;
      const status = activeScan.get(scanId) || { status: "unknown", progress: 0 };
      return status;
    }

    case "get_scan_results": {
      const scanId = params?.scan_id as string;
      try {
        const scanFile = path.join(PATHS.SCANS_DIR, `${scanId}.json`);
        const content = await readFile(scanFile, "utf-8");
        return JSON.parse(content);
      } catch {
        return { error: `Scan ${scanId} not found` };
      }
    }

    case "apply_fix": {
      const scanId = params?.scan_id as string;
      const cveId = params?.cve_id as string;
      // In production, would apply patch and push branch
      return { branch: `codeprobe-fix-${scanId}`, commit: `Fix ${cveId}` };
    }

    default:
      throw new Error(`Unknown tool: ${method}`);
  }
}

async function handleResourceRequest(resource: string): Promise<string> {
  switch (resource) {
    case "codeprobe://cve-cache": {
      try {
        const cacheFile = PATHS.CVE_CACHE;
        return await readFile(cacheFile, "utf-8");
      } catch {
        return "{}";
      }
    }

    case "codeprobe://poc-scripts": {
      return JSON.stringify({
        scripts: [
          { id: "CVE-2022-29078", name: "ejs-rce", description: "Template injection RCE" },
          { id: "CVE-2023-44487", name: "http2-dos", description: "HTTP/2 Rapid Reset DoS" },
        ],
      });
    }

    default:
      throw new Error(`Unknown resource: ${resource}`);
  }
}

async function handleRequest(req: MCPRequest): Promise<MCPResponse> {
  try {
    const result = await handleToolCall(req.method, req.params);

    return {
      jsonrpc: "2.0",
      id: req.id,
      result: result as Record<string, unknown>,
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function main() {
  console.log("🌐 CodeProbe MCP Server starting...");
  console.log("🔌 Listening on stdin/stdout for MCP protocol");

  const stdin = Bun.stdin;
  let buffer = "";

  for await (const chunk of stdin.stream()) {
    const text = new TextDecoder().decode(chunk);
    buffer += text;

    // Process complete JSON-RPC requests
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const req = JSON.parse(line) as MCPRequest;
        const res = await handleRequest(req);
        console.log(JSON.stringify(res));
      } catch (error) {
        console.error("Parse error:", error);
      }
    }
  }
}

main().catch(console.error);
