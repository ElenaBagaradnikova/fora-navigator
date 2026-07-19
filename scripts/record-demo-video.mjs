import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const workspace = process.cwd();
const port = "3115";
const baseURL = `http://127.0.0.1:${port}`;
const outputDir = path.join(workspace, "test-results", "video");
const rawDir = path.join(outputDir, "raw");
const outputPath = path.join(outputDir, "fora-navigator-visual.webm");
const nextCli = path.join(workspace, "node_modules", "next", "dist", "bin", "next");
const logoPath = path.join(workspace, "public", "fora-logo.jpg");

await access(path.join(workspace, ".next", "BUILD_ID")).catch(() => {
  throw new Error("Production build not found. Run `pnpm build` first.");
});
await mkdir(rawDir, { recursive: true });

const logoBytes = await readFile(logoPath);
const logoData = `data:image/jpeg;base64,${logoBytes.toString("base64")}`;
const server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", port], {
  cwd: workspace,
  env: { ...process.env, ENABLE_LIVE_AI: "false", ENABLE_CONSULTATION_HANDOFF: "false" },
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Production server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Production server did not start at ${baseURL}.`);
}

const introHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif}
body{background:#050709;color:#fff}.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px;opacity:0;transition:opacity .65s ease}.scene.active{opacity:1}
.dark{background:#050709}.light{background:#fff;color:#081a3c}.main{font-size:58px;line-height:1.12;font-weight:650;letter-spacing:-1.5px;max-width:1180px}.stack{display:grid;gap:20px}.stack span{opacity:0;animation:rise .65s ease forwards}.active .stack span:nth-child(1){animation-delay:.1s}.active .stack span:nth-child(2){animation-delay:1s}.active .stack span:nth-child(3){animation-delay:1.9s}.active .stack span:nth-child(4){animation-delay:2.6s}@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.logo{width:250px;height:250px;object-fit:contain}.brand{font-size:48px;margin-top:18px;font-weight:700;letter-spacing:-1px}.tag{font-size:25px;color:#28538f;margin-top:12px}.slogan{font-size:46px;line-height:1.35;font-weight:650}.accent{color:#54b8ee}.eyebrow{font-size:18px;letter-spacing:4px;text-transform:uppercase;color:#54b8ee;margin-bottom:24px}
</style></head><body>
<section class="scene dark active"><div class="main">We have just moved to Spain.</div></section>
<section class="scene dark"><div class="main">My son has autism.</div></section>
<section class="scene dark"><div class="main">I don’t know what to do first.</div></section>
<section class="scene dark"><div class="stack main"><span>Information exists.</span><span>Support exists.</span><span class="accent">But navigating it is overwhelming.</span></div></section>
<section class="scene light"><img class="logo" src="${logoData}" alt="FORA"><div class="brand">Personal AI Social Work Navigator</div><div class="tag">Human support remains within reach.</div></section>
<section class="scene dark"><div class="eyebrow">FORA</div><div class="stack slogan"><span>For Assistance.</span><span>For Guidance.</span><span>For People.</span><span class="accent">Support FOR ALL.</span></div></section>
</body></html>`;

function sceneScript() {
  return (value) => {
    const scenes = [...document.querySelectorAll(".scene")];
    scenes.forEach((scene, position) => scene.classList.toggle("active", position === value));
  };
}

let browser;
let context;
let page;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } },
  });
  page = await context.newPage();
  page.setDefaultTimeout(7000);
  await page.setContent(introHtml, { waitUntil: "load" });
  const startedAt = Date.now();
  const waitUntil = async (seconds) => delay(Math.max(0, startedAt + seconds * 1000 - Date.now()));

  await waitUntil(3);
  await page.evaluate(sceneScript(1), 1);
  await waitUntil(6);
  await page.evaluate(sceneScript(2), 2);
  await waitUntil(10);
  await page.evaluate(sceneScript(3), 3);
  await waitUntil(14);
  await page.evaluate(sceneScript(4), 4);
  await waitUntil(17);
  await page.evaluate(sceneScript(5), 5);
  await waitUntil(20);

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("fora-navigator:locale:v1", "en");
    } catch {
      // The intro document has no application origin; the app navigation does.
    }
    window.addEventListener("DOMContentLoaded", () => {
      const cursor = document.createElement("div");
      cursor.id = "fora-demo-cursor";
      Object.assign(cursor.style, {
        position: "fixed", width: "28px", height: "28px", borderRadius: "999px",
        border: "3px solid #ef6f61", background: "rgba(255,255,255,.72)",
        boxShadow: "0 2px 10px rgba(0,0,0,.25)", zIndex: "2147483647",
        pointerEvents: "none", transform: "translate(-50%,-50%)", left: "50%", top: "50%",
      });
      document.body.appendChild(cursor);
      window.addEventListener("mousemove", (event) => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      });
    });
  });

  await page.goto(`${baseURL}?lang=en`, { waitUntil: "networkidle" });
  console.log("scene: english landing");
  await waitUntil(25);
  const teenager = page.getByRole("button", { name: /Teenager, age 16/ });
  await teenager.scrollIntoViewIfNeeded();
  await waitUntil(28);
  await teenager.click();

  for (const target of [31, 34, 37, 40, 43, 46, 49, 51, 53, 55]) {
    await waitUntil(target);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await waitUntil(56);
  await page.getByRole("button", { name: "Review answers", exact: true }).click();
  await page.waitForURL(/\/review$/);
  console.log("scene: case review");
  await waitUntil(60);
  const dataDetails = page.getByText("What matters about the data", { exact: true });
  await dataDetails.scrollIntoViewIfNeeded();
  await dataDetails.click();
  await waitUntil(62);
  const localButton = page.getByRole("button", { name: "Create my pathway locally", exact: true });
  await localButton.scrollIntoViewIfNeeded();
  await waitUntil(63);
  await localButton.click();
  await page.waitForURL(/\/plan$/);
  console.log("scene: pathway");

  await waitUntil(78);
  const caseMap = page.getByRole("heading", { name: "How the steps connect", exact: true });
  await caseMap.scrollIntoViewIfNeeded();
  await waitUntil(86);
  const nowHeading = page.getByRole("heading", { name: "Now", exact: true });
  await nowHeading.scrollIntoViewIfNeeded();
  await waitUntil(96);

  await page.getByRole("button", { name: "Documents", exact: true }).click();
  await waitUntil(104);
  await page.getByRole("button", { name: "Letters", exact: true }).click();
  await waitUntil(111);
  await page.getByRole("button", { name: "Trust", exact: true }).click();
  await waitUntil(118);

  await page.getByRole("button", { name: "Consultation", exact: true }).click();
  await waitUntil(124);
  const contactInput = page.locator('input[type="email"]');
  if (await contactInput.count() !== 1) throw new Error("Expected one consultation email field.");
  await contactInput.fill("demo.user@example.test");
  console.log("scene: consultation preview");
  await waitUntil(130);
  const consent = page.locator('input[type="checkbox"]');
  if (await consent.count() !== 1) throw new Error("Expected one consultation consent field.");
  await consent.scrollIntoViewIfNeeded();
  await consent.check();
  await waitUntil(135);
  await page.getByRole("button", { name: "Test demo request", exact: true }).click();
  const receipt = page.getByText("Test complete. Nothing was sent", { exact: true });
  await receipt.waitFor();
  await receipt.scrollIntoViewIfNeeded();
  console.log("scene: demo receipt");
  await waitUntil(140);

  await page.evaluate(() => {
    const overlay = document.createElement("section");
    overlay.id = "build-overlay";
    overlay.innerHTML = `<div class="build-card"><p class="build-eye">OPENAI BUILD WEEK</p><h1>Built with Codex</h1><p>Product specification · multilingual UX · typed safety contracts · production diagnostics</p><div class="build-rule"></div><h2>GPT-5.6 Terra</h2><p>Responses API · Structured Outputs · deterministic postflight</p><footer>59 unit/integration tests · 16 desktop/mobile checks</footer></div>`;
    Object.assign(overlay.style, {position:"fixed",inset:"0",zIndex:"2147483646",display:"grid",placeItems:"center",background:"rgba(4,20,30,.94)",color:"white",fontFamily:'Inter,"Segoe UI",sans-serif'});
    const style = document.createElement("style");
    style.textContent = `.build-card{width:min(1000px,82vw);padding:58px 68px;border:1px solid rgba(255,255,255,.25);background:#0b2830;box-shadow:0 28px 80px rgba(0,0,0,.35)}.build-eye{letter-spacing:4px;color:#6ed5d2;font-weight:800}.build-card h1{font:700 66px/1.05 Georgia,serif;margin:18px 0}.build-card h2{font:700 42px/1.1 Georgia,serif;margin:26px 0 14px}.build-card p{font-size:24px;line-height:1.45;color:#d9e7e6}.build-rule{height:3px;background:#e97764;margin:34px 0}.build-card footer{margin-top:38px;font-weight:800;color:#ffcf68;font-size:22px}`;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  });

  await waitUntil(160);
  await page.evaluate(() => document.getElementById("build-overlay")?.remove());
  await page.getByRole("button", { name: "Pathway", exact: true }).click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => {
    const banner = document.createElement("div");
    banner.textContent = "LIVE ON VERCEL · DEMO MODE · NO ACCOUNT OR API KEY";
    Object.assign(banner.style, {position:"fixed",left:"50%",bottom:"30px",transform:"translateX(-50%)",zIndex:"2147483646",padding:"16px 28px",borderRadius:"999px",background:"#082f32",color:"white",font:"800 18px Inter,Segoe UI,sans-serif",letterSpacing:"1px",boxShadow:"0 10px 35px rgba(0,0,0,.28)"});
    document.body.appendChild(banner);
  });
  await waitUntil(170);
  await page.setContent(`<html><body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;background:#fff;font-family:Inter,Segoe UI,sans-serif;color:#0b2448;text-align:center"><main><img src="${logoData}" style="width:270px;height:270px;object-fit:contain"><h1 style="font-size:58px;margin:10px 0">FORA Navigator</h1><p style="font-size:28px;color:#27628f">A pathway for the family.</p></main></body></html>`);
  await waitUntil(174);

  const recordedVideo = page.video();
  await context.close();
  context = undefined;
  const rawPath = await recordedVideo.path();
  await copyFile(rawPath, outputPath);
  console.log(outputPath);
} finally {
  if (context) {
    await Promise.race([context.close().catch(() => undefined), delay(15000)]);
  }
  await browser?.close().catch(() => undefined);
  if (server.exitCode === null) {
    server.kill();
    await Promise.race([once(server, "exit"), delay(3000)]);
  }
}
