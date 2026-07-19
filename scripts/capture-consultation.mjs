import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const workspace = process.cwd();
const port = "3111";
const baseURL = `http://127.0.0.1:${port}`;
const outputDir = path.join(workspace, "test-results", "visual-review");
const nextCli = path.join(workspace, "node_modules", "next", "dist", "bin", "next");

await mkdir(outputDir, { recursive: true });

const server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", port], {
  cwd: workspace,
  env: {
    ...process.env,
    ENABLE_LIVE_AI: "false",
    ENABLE_CONSULTATION_HANDOFF: "false",
  },
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // Still starting.
    }
    await delay(250);
  }
  throw new Error("Visual review server did not start.");
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(baseURL);
  await page.getByRole("button", { name: /Подросток, 16 лет/ }).click();
  for (let index = 0; index < 10; index += 1) await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByRole("button", { name: "Проверить ответы" }).click();
  await page.getByRole("button", { name: /Создать мой маршрут/ }).click();
  await page.waitForURL(/\/plan$/);
  await page.getByRole("button", { name: /Консультация/ }).click();
  await page.getByLabel("Контакт для ответа").fill("demo.user@example.test");
  await page.screenshot({ path: path.join(outputDir, "consultation-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(outputDir, "consultation-mobile.png"), fullPage: true });
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill();
    await Promise.race([once(server, "exit"), delay(3_000)]);
  }
}

console.log(outputDir);
