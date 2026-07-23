import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(process.cwd());
const outputDir = path.join(root, "docs", "admin-training", "screenshots");
fs.mkdirSync(outputDir, { recursive: true });

const apiPort = process.env.DOCS_API_PORT || "5300";
const adminPort = process.env.DOCS_ADMIN_PORT || "5374";
const apiBase = `http://127.0.0.1:${apiPort}`;
const adminBase = `http://127.0.0.1:${adminPort}`;
const e2eSecret = "local-e2e-secret-32-characters";
const demoPassword = "Mec-Training-Demo-2026!";

const children = [];

const spawnNpm = (args, cwd, env) => {
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: process.platform === "win32",
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  children.push(child);
  return child;
};

const waitFor = async (url, timeoutMs = 90_000) => {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
      last = `${response.status} ${await response.text().catch(() => "")}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for ${url}: ${last}`);
};

const api = async (pathName, options = {}) => {
  const response = await fetch(`${apiBase}${pathName}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${e2eSecret}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${pathName} failed ${response.status}: ${await response.text()}`);
  return response.json().catch(() => ({}));
};

const seedRole = async (role) => {
  const username = `training_${role}`;
  const email = `${username}@example.test`;
  await api("/api/e2e/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      username,
      password: demoPassword,
      firstName: role === "super_admin" ? "Super" : role[0].toUpperCase() + role.slice(1),
      lastName: "Training",
      role,
      isActive: true,
      mfaConfirmed: false,
    }),
  });
  return { username, email, password: demoPassword, role };
};

const sanitizePage = async (page) => {
  await page.addStyleTag({
    content: `
      input[type="password"], input[name*="password" i], input[name*="token" i] { color: transparent !important; text-shadow: 0 0 8px #111 !important; }
      [data-sensitive], .secret, code { filter: blur(3px); }
    `,
  }).catch(() => undefined);
};

const shot = async (page, name, caption) => {
  await sanitizePage(page);
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: true,
  });
  return { file: `${name}.png`, caption };
};

const login = async (page, account) => {
  await page.goto(`${adminBase}/admin/auth`, { waitUntil: "networkidle" });
  await page.getByLabel("Username").fill(account.username);
  await page.getByPlaceholder("Enter your password").fill(account.password);
  await shot(page, "01-login-page", "Admin sign-in page with username and password fields.");
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: account.username, password: account.password }),
  });
  if (!response.ok) throw new Error(`API login failed ${response.status}: ${await response.text()}`);
  const body = await response.json();
  await page.goto(`${adminBase}/admin/auth`);
  await page.evaluate((token) => localStorage.setItem("token", token), body.token);
  await page.goto(`${adminBase}/admin`, { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
};

const visitAndCapture = async (page, route, name, caption) => {
  await page.goto(`${adminBase}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(700);
  return shot(page, name, caption);
};

const main = async () => {
  spawnNpm(["run", "e2e:server"], root, {
    NODE_ENV: "development",
    PORT: apiPort,
    E2E_TEST_SECRET: e2eSecret,
    EMAIL_DRY_RUN: "true",
    ADMIN_TWO_FACTOR_REQUIRED: "false",
    API_ONLY: "true",
    NODE_OPTIONS: "--dns-result-order=ipv4first",
  });
  spawnNpm(["run", "dev"], path.join(root, "Admin"), {
    NODE_ENV: "development",
    PORT: apiPort,
    ADMIN_PORT: adminPort,
    VITE_ADMIN_PORT: adminPort,
    VITE_API_URL: apiBase,
  });

  await waitFor(`${apiBase}/api/health`);
  await waitFor(`${adminBase}/admin/auth`);
  await api("/api/e2e/admin-settings", { method: "POST", body: JSON.stringify({ twoFactorRequired: false }) });

  const accounts = {};
  for (const role of ["super_admin", "admin", "writer", "viewer"]) {
    accounts[role] = await seedRole(role);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const figures = [];
  await login(page, accounts.super_admin);

  const pages = [
    ["/admin", "02-dashboard", "Main dashboard with overview metrics and recent activity."],
    ["/admin", "03-navigation-menu", "Admin navigation menu grouped by Overview, Content, People, Intelligence, and System."],
    ["/admin/users", "04-users-list", "Users page for super administrator account creation and management."],
    ["/admin/roles", "05-roles-permissions", "Roles and Permissions page showing access-control configuration."],
    ["/admin/scholarships", "06-scholarships", "Scholarships management list and publishing controls."],
    ["/admin/jobs", "07-job-opportunities", "Job Opportunities management list."],
    ["/admin/applications", "08-applications", "Applications review page with status controls and export action."],
    ["/admin/messages", "09-consultation-messages", "Messages inbox for consultation and contact requests."],
    ["/admin/blog", "10-blog-posts", "Blog Posts content management page."],
    ["/admin/events", "11-events", "Events management page for event records and registrations."],
    ["/admin/partners", "12-partners", "Partners management page."],
    ["/admin/team", "13-team-members", "Team Members management page."],
    ["/admin/subscribers", "14-subscribers", "Newsletter subscriber management page."],
    ["/admin/communications", "15-communications", "Communications center for templates, campaigns, workflow, and audit."],
    ["/admin/payments", "16-payments", "Payments page for Stripe transaction operations where configured."],
    ["/admin/media", "17-media-governance", "Media Governance page for assets and audit."],
    ["/admin/analytics", "18-analytics", "Analytics page with content and application metrics."],
    ["/admin/activity", "19-activity", "Activity page for administrative progress and recent activity."],
    ["/admin/ai-chat", "20-ai-chat", "AI Chat Assistant monitoring page, currently marked Beta."],
    ["/admin/settings", "21-settings", "Settings page for security, sessions, cache, and platform configuration."],
  ];

  for (const [route, name, caption] of pages) {
    figures.push(await visitAndCapture(page, route, name, caption));
  }

  await page.goto(`${adminBase}/admin/scholarships`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /add|create|new/i }).first().click().catch(() => undefined);
  await page.waitForTimeout(500);
  figures.push(await shot(page, "22-scholarship-form-or-create", "Scholarship create/edit workflow entry point."));

  await page.setViewportSize({ width: 390, height: 844 });
  figures.push(await visitAndCapture(page, "/admin/subscribers", "23-mobile-subscribers", "Responsive mobile view of the Subscribers page."));

  await browser.close();

  fs.writeFileSync(
    path.join(outputDir, "figures.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), apiBase, adminBase, figures, accounts: Object.keys(accounts) }, null, 2),
  );
};

main().finally(() => {
  for (const child of children) child.kill();
});
