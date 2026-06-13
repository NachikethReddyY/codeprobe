import { exchangeGitHubToken, validateGitHubToken } from "./auth.ts";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

interface AuthState {
  tokens: Map<string, string>;
}

const auth: AuthState = {
  tokens: new Map(),
};

async function getScans() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const scansDir = `${home}/.codeprobe/scans`;
  try {
    const fs = await import("fs");
    const fileNames = fs.readdirSync(scansDir);
    const scans = await Promise.all(
      fileNames
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const path = `${scansDir}/${f}`;
          const content = await Bun.file(path).text();
          return JSON.parse(content);
        })
    );
    return scans.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("Error reading scans:", e);
    return [];
  }
}

async function getScan(scanId: string) {
  const path = `${process.env.HOME || process.env.USERPROFILE}/.codeprobe/scans/${scanId}.json`;
  try {
    const content = await Bun.file(path).text();
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function requireAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  // In dev mode, allow any Bearer token
  if (process.env.NODE_ENV !== "production") {
    return token.length > 0;
  }

  return auth.tokens.has(token);
}

export default Bun.serve({
  port: 3000,
  development: process.env.NODE_ENV !== "production",
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    // OAuth callback
    if (path === "/api/auth/github" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response(JSON.stringify({ error: "No code provided" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      try {
        const token = await exchangeGitHubToken(code, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET);
        if (!token) {
          return new Response(JSON.stringify({ error: "Auth failed" }), {
            status: 401,
            headers: corsHeaders,
          });
        }

        const sessionToken = `session_${Date.now()}`;
        auth.tokens.set(sessionToken, token);

        return new Response(JSON.stringify({ token: sessionToken }), {
          status: 200,
          headers: corsHeaders,
        });
      } catch (e) {
        console.error("OAuth error:", e);
        return new Response(JSON.stringify({ error: "Auth failed" }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Logout
    if (path === "/api/auth/logout" && req.method === "GET") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      auth.tokens.delete(token);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // List scans
    if (path === "/api/scans" && req.method === "GET") {
      if (!requireAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const scans = await getScans();
      return new Response(JSON.stringify(scans), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Get scan detail
    if (path.match(/^\/api\/scans\/[^/]+$/) && req.method === "GET") {
      if (!requireAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const scanId = path.split("/").pop()!;
      const scan = await getScan(scanId);

      if (!scan) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify(scan), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Not found
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log("🚀 API server listening on http://localhost:3000");
