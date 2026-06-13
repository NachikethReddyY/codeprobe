import { createEngine } from "../engine/index";
import { Report } from "../shared/types";

// Environment validation
const GOOGLE_CLOUD_URL = process.env.GOOGLE_CLOUD_URL;
const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN;
const PORT = parseInt(process.env.PORT || "8080");
const NODE_ENV = process.env.NODE_ENV || "development";

// Validate required environment variables
if (NODE_ENV === "production") {
  if (!GOOGLE_CLOUD_URL) {
    throw new Error(
      "GOOGLE_CLOUD_URL environment variable is required in production"
    );
  }
  if (!API_SECRET_TOKEN) {
    throw new Error(
      "API_SECRET_TOKEN environment variable is required in production"
    );
  }
}

// Rate limiting: max 5 requests per minute per IP
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // In production on Google Cloud, you should rely on x-forwarded-for
  // For local testing, use localhost
  return req.headers.get("cf-connecting-ip") || "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // Window expired, create new entry
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// Type for scan request
interface ScanRequest {
  dependencies?: Array<{ name: string; version: string }>;
  repoPath?: string;
}

interface ScanResponse {
  success: boolean;
  data?: Report;
  error?: string;
  riskScore?: number;
  executiveSummary?: {
    totalCVEs: number;
    exploitableCVEs: number;
    theoreticalCVEs: number;
    scanDurationMs: number;
    timestamp: string;
  };
}

async function handleScan(
  req: Request,
  ip: string
): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as ScanRequest;

    // Validate request
    if (!body.repoPath && (!body.dependencies || body.dependencies.length === 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Request must include either repoPath or dependencies array",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const repoPath = body.repoPath || process.cwd();

    // Log sponsor branding
    console.log("[Bright Data] Scraping CVE data from NVD, Exploit-DB, Snyk...");
    console.log("[Daytona] Sandboxing exploits for verification...");
    console.log("[Nosana] Patching vulnerable dependencies...");

    // Run scan
    const engine = createEngine();
    console.log(`\n🔍 Starting security scan for: ${repoPath}`);
    const report = await engine.scan(repoPath);

    const response: ScanResponse = {
      success: true,
      data: report,
      riskScore: report.scan.risk_score,
      executiveSummary: {
        totalCVEs: report.summary.total_cves,
        exploitableCVEs: report.summary.exploitable_count,
        theoreticalCVEs: report.summary.theoretical_count,
        scanDurationMs: report.summary.scan_duration_ms,
        timestamp: report.scan.timestamp,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateLimitMap.get(ip)?.count || 0),
      },
    });
  } catch (error) {
    console.error("Scan error:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    const errorResponse: ScanResponse = {
      success: false,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleHealth(): Promise<Response> {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Main server
const server = Bun.serve({
  port: PORT,
  development: NODE_ENV !== "production",
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;
    const ip = getClientIP(req);

    // Health check
    if (pathname === "/health" && method === "GET") {
      return handleHealth();
    }

    // Scan endpoint
    if (pathname === "/api/scan" && method === "POST") {
      // Rate limiting check
      const rateLimit = checkRateLimit(ip);
      if (!rateLimit.allowed) {
        console.warn(`Rate limit exceeded for IP: ${ip}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Maximum 5 requests per minute.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          }
        );
      }

      // Token validation in production
      if (NODE_ENV === "production") {
        const authHeader = req.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "");

        if (token !== API_SECRET_TOKEN) {
          console.warn(`Invalid API token from IP: ${ip}`);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid or missing API token",
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // Handle scan
      return handleScan(req, ip);
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown route: ${pathname}`,
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});

// Log startup information
console.log("\n╔════════════════════════════════════════════════════════╗");
console.log("║     CodeProbe Security Scan API Server (CLI-only)     ║");
console.log("╚════════════════════════════════════════════════════════╝\n");
console.log(`📍 Environment: ${NODE_ENV}`);
console.log(`🚀 Server running on http://localhost:${PORT}`);
console.log(`\n📊 Available endpoints:`);
console.log(`   GET  /health              - Health check`);
console.log(`   POST /api/scan            - Run vulnerability scan\n`);

if (NODE_ENV === "production") {
  console.log(`✅ Production mode enabled`);
  console.log(`   - Google Cloud URL configured: ${GOOGLE_CLOUD_URL}`);
  console.log(`   - API authentication required (Bearer token)\n`);
} else {
  console.log(`⚠️  Development mode - authentication disabled\n`);
}

console.log(`📈 Rate limiting: 5 requests per minute per IP`);
console.log(
  `\n💡 Example request:\n`
);
console.log(`   curl -X POST http://localhost:${PORT}/api/scan \\`);
console.log(`     -H "Content-Type: application/json" \\`);
if (NODE_ENV === "production") {
  console.log(`     -H "Authorization: Bearer $API_SECRET_TOKEN" \\`);
}
console.log(`     -d '{"repoPath": "/path/to/repo"}'\n`);

console.log(`🔗 Sponsor credits:`);
console.log(`   [Bright Data] - CVE data scraping from NVD, Exploit-DB, Snyk`);
console.log(`   [Daytona] - Sandboxed exploit verification`);
console.log(`   [Nosana] - LLM-powered patch generation\n`);

export default server;
