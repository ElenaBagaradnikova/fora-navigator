import { defineConfig, devices } from "@playwright/test";

const useSystemEdge = process.env.PLAYWRIGHT_USE_SYSTEM_EDGE === "1";
const port = process.env.PLAYWRIGHT_PORT || "3107";
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], ...(useSystemEdge ? { channel: "msedge" } : {}) } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], ...(useSystemEdge ? { channel: "msedge" } : {}) } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
