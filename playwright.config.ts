import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT || 5000);
const adminPort = Number(process.env.ADMIN_PORT || 5174);
const apiBaseURL = process.env.E2E_API_BASE_URL || `http://127.0.0.1:${port}`;
const clientBaseURL = process.env.E2E_CLIENT_BASE_URL || apiBaseURL;
const adminBaseURL = process.env.E2E_ADMIN_BASE_URL || `http://127.0.0.1:${adminPort}`;
const e2eSecret = process.env.E2E_TEST_SECRET || "local-e2e-secret-32-characters";

const sharedServerEnv = {
  NODE_ENV: "development",
  PORT: String(port),
  ADMIN_PORT: String(adminPort),
  HOST: "127.0.0.1",
  DEV_API_HOST: "127.0.0.1",
  JWT_SECRET: process.env.JWT_SECRET || "playwright-e2e-jwt-secret-32-chars",
  E2E_TEST_SECRET: e2eSecret,
  EMAIL_DRY_RUN: "true",
  EMAIL_ALLOW_LIVE_TEST_SENDS: "false",
  EMAIL_PROVIDER_ORDER: "sendgrid,ses",
  EMAIL_PROVIDER_INLINE_RETRIES: "2",
  EMAIL_ACTIVATION_REQUIRES_DNS_READY: "false",
  EMAIL_QUEUE_WORKER_ENABLED: "false",
  EMAIL_WEBHOOK_SIGNING_SECRET: process.env.EMAIL_WEBHOOK_SIGNING_SECRET || "playwright-webhook-secret",
  RECAPTCHA_SECRET_KEY: "",
  PUBLIC_APP_URL: clientBaseURL,
  API_APP_URL: apiBaseURL,
  ADMIN_APP_URL: adminBaseURL,
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: clientBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run e2e:server",
      url: `${apiBaseURL}/api/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: sharedServerEnv,
    },
    {
      command: "npm run e2e:admin",
      url: `${adminBaseURL}/admin/auth`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: sharedServerEnv,
    },
  ],
});
