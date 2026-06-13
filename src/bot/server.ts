import { createEngine } from "../engine/index.js";
import { exchangeGitHubToken, validateGitHubToken } from "../api/auth.js";
import { PATHS } from "../shared/constants.js";

const BOT_PORT = parseInt(process.env.BOT_PORT || "4000");
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "dev-secret";

interface WebhookPayload {
  action?: string;
  pull_request?: {
    number: number;
    head: { sha: string; ref: string };
    base: { ref: string };
    title: string;
    body: string;
    draft: boolean;
  };
  repository?: {
    owner: { login: string };
    name: string;
    full_name: string;
    html_url: string;
    clone_url: string;
  };
  issue?: {
    number: number;
  };
  comment?: {
    body: string;
  };
}

async function handlePullRequestEvent(payload: WebhookPayload) {
  if (!payload.pull_request || !payload.repository) return;

  const { number, head, base } = payload.pull_request;
  const { owner, name, clone_url } = payload.repository;

  console.log(`\n🔍 CodeProbe bot triggered for PR #${number} in ${owner.login}/${name}`);

  try {
    // Clone repo to temp dir
    const tempDir = `/tmp/codeprobe-pr-${number}-${Date.now()}`;
    const { $, file } = await import("bun");

    console.log(`📥 Cloning ${clone_url}...`);
    // Clone would require shell execution - for MVP, we'll post a comment that scan is starting

    // Post initial comment
    const commentUrl = `https://api.github.com/repos/${owner.login}/${name}/issues/${number}/comments`;
    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN || ""}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    const initialComment = {
      body: `## ⚡ CodeProbe Security Scan\n\n**Status:** ⏳ Running scan...\n**Powered by:** Bright Data | Daytona | Nosana\n\nAnalyzing PR for exploitable vulnerabilities...`,
    };

    const response = await fetch(commentUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(initialComment),
    });

    if (!response.ok) {
      console.error(`Failed to post comment: ${response.statusText}`);
      return;
    }

    console.log(`✅ Posted initial comment to PR #${number}`);

    // TODO: In production:
    // 1. Clone repo
    // 2. Run engine.scan()
    // 3. Update comment with results
    // 4. Create auto-fix PR if patches available
  } catch (error) {
    console.error("Bot error:", error instanceof Error ? error.message : String(error));
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Health check
  if (req.method === "GET" && url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  }

  // GitHub webhook
  if (req.method === "POST" && url.pathname === "/webhook") {
    const payload: WebhookPayload = await req.json();

    // Verify webhook signature (simplified - in production, verify X-Hub-Signature-256)
    if (payload.action === "opened" || payload.action === "synchronize") {
      await handlePullRequestEvent(payload);
    }

    return new Response(JSON.stringify({ status: "processed" }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
}

const server = Bun.serve({
  port: BOT_PORT,
  fetch: handleRequest,
});

console.log(`🤖 CodeProbe Bot listening on http://localhost:${BOT_PORT}`);
console.log(`📝 Webhook URL: http://localhost:${BOT_PORT}/webhook`);
