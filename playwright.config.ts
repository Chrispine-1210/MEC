import fs from "fs";
import path from "path";
import { defineConfig } from "@playwright/test";

const resolveChromiumExecutablePath = () => {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return undefined;

  const root = path.join(localAppData, "ms-playwright");
  if (!fs.existsSync(root)) return undefined;

  const candidates = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
    .map((entry) => path.join(root, entry.name))
    .sort((a, b) => b.localeCompare(a));

  for (const candidate of candidates) {
    const directPath = path.join(candidate, "chrome-win64", "chrome.exe");
    if (fs.existsSync(directPath)) return directPath;

    const fallbackPath = path.join(candidate, "chrome-win", "chrome.exe");
    if (fs.existsSync(fallbackPath)) return fallbackPath;
  }

  return undefined;
};

const chromiumExecutablePath = resolveChromiumExecutablePath();
const e2ePort = Number(process.env.E2E_PORT || 5050);
const e2eBaseUrl = process.env.E2E_BASE_URL || `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
    launchOptions: chromiumExecutablePath
      ? {
          executablePath: chromiumExecutablePath,
        }
      : undefined,
  },
  webServer: {
    command: `npx cross-env PORT=${e2ePort} npm run start`,
    url: `${e2eBaseUrl}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  reporter: [["list"]],
});
