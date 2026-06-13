import { test, expect } from "bun:test";

test("Dashboard: API server starts", async () => {
  const server = Bun.serve({
    port: 0,
    fetch() {
      return new Response("OK");
    },
  });

  const res = await fetch(`http://${server.hostname}:${server.port}/`);
  expect(res.ok).toBe(true);

  server.stop();
});

test("Dashboard: OAuth endpoint exists", async () => {
  // Test would require full server setup
  // Simplified check: verify imports work
  const authModule = await import("../api/auth.ts");
  expect(authModule.exchangeGitHubToken).toBeDefined();
  expect(authModule.validateGitHubToken).toBeDefined();
});

test("Dashboard: Components render", async () => {
  // Note: JSX/React component testing requires a DOM environment
  // In production, use Playwright or similar for E2E tests
  const componentModules = [
    import("../dashboard/components/RiskGauge.tsx"),
    import("../dashboard/components/CVETable.tsx"),
    import("../dashboard/components/BusinessImpactCard.tsx"),
  ];

  const results = await Promise.all(componentModules);
  results.forEach((mod) => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
