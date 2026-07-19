import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const workspace = process.cwd();
const videoDir = path.join(workspace, "test-results", "video");
const visualPath = path.join(videoDir, "fora-navigator-visual.webm");
const audioPath = path.join(videoDir, "fora-navigator-voiceover.wav");
const outputDir = path.join(workspace, "docs", "video");
const outputPath = path.join(outputDir, "fora-navigator-build-week-demo.webm");

await Promise.all([stat(visualPath), stat(audioPath)]);
await mkdir(outputDir, { recursive: true });

const mixerHtml = `<!doctype html><html><body style="margin:0;background:#111;color:white;font-family:sans-serif;display:grid;place-items:center;min-height:100vh"><button id="start" style="font-size:24px;padding:20px 32px">Start mix</button><video id="video" src="/visual.webm" preload="auto" style="display:none"></video><audio id="audio" src="/voice.wav" preload="auto"></audio><script>
const start = document.getElementById('start');
start.addEventListener('click', async () => {
  start.disabled = true;
  const video = document.getElementById('video');
  const audio = document.getElementById('audio');
  await Promise.all([new Promise(r => video.readyState >= 2 ? r() : video.addEventListener('loadeddata', r, {once:true})), new Promise(r => audio.readyState >= 2 ? r() : audio.addEventListener('loadeddata', r, {once:true}))]);
  video.currentTime = 0; audio.currentTime = 0;
  const videoStream = video.captureStream();
  const audioStream = audio.captureStream();
  const mixed = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
  if (!mixed.getVideoTracks().length || !mixed.getAudioTracks().length) throw new Error('Missing captured media tracks');
  const chunks = [];
  const recorder = new MediaRecorder(mixed, {mimeType:'video/webm;codecs=vp8,opus', videoBitsPerSecond:6000000, audioBitsPerSecond:128000});
  recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
  const stopped = new Promise(resolve => recorder.addEventListener('stop', resolve, {once:true}));
  recorder.start(1000);
  await Promise.all([video.play(), audio.play()]);
  await new Promise(resolve => video.addEventListener('ended', resolve, {once:true}));
  recorder.stop();
  await stopped;
  const blob = new Blob(chunks, {type:'video/webm'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = 'fora-navigator-build-week-demo.webm';
  document.body.appendChild(link); link.click();
});
</script></body></html>`;

const server = http.createServer((request, response) => {
  if (request.url === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(mixerHtml);
    return;
  }
  const file = request.url === "/visual.webm" ? visualPath : request.url === "/voice.wav" ? audioPath : null;
  if (!file) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { "content-type": file.endsWith(".wav") ? "audio/wav" : "video/webm" });
  createReadStream(file).pipe(response);
});

await new Promise(resolve => server.listen(3116, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3116", { waitUntil: "domcontentloaded" });
  const downloadPromise = page.waitForEvent("download", { timeout: 240000 });
  await page.getByRole("button", { name: "Start mix", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(outputPath);
  console.log(outputPath);
} finally {
  await browser?.close();
  server.close();
}
