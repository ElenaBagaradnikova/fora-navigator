import { spawn } from "node:child_process";
import { once } from "node:events";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const workspace = process.cwd();
const port = process.env.PLAYWRIGHT_PORT || "3107";
const baseURL = `http://127.0.0.1:${port}`;
const nextCli = path.join(workspace, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(workspace, "node_modules", "@playwright", "test", "cli.js");

await access(path.join(workspace, ".next", "BUILD_ID")).catch(() => {
  throw new Error("Production build not found. Run `pnpm build` before `pnpm test:e2e`.");
});

const server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", port], {
  cwd: workspace,
  env: { ...process.env, ENABLE_LIVE_AI: "false" },
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Production server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Production server did not become ready at ${baseURL}.`);
}

async function stopServer() {
  if (server.exitCode !== null || server.killed) return;
  server.kill();
  await Promise.race([once(server, "exit"), delay(3_000)]);
}

let exitCode = 1;
try {
  await waitForServer();
  const tests = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: workspace,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
    stdio: "inherit",
  });
  const [code] = await once(tests, "exit");
  exitCode = typeof code === "number" ? code : 1;
} finally {
  await stopServer();
}

process.exitCode = exitCode;
