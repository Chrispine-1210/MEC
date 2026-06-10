import { createHmac } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const apiBaseURL = process.env.E2E_API_BASE_URL || "http://127.0.0.1:5000";
const adminBaseURL = process.env.E2E_ADMIN_BASE_URL || "http://127.0.0.1:5174";
const e2eSecret = process.env.E2E_TEST_SECRET || "local-e2e-secret-32-characters";
const webhookSecret = process.env.EMAIL_WEBHOOK_SIGNING_SECRET || "playwright-webhook-secret";
const e2eHeaders = { Authorization: `Bearer ${e2eSecret}` };
const strongPassword = "Mec-E2E-Account-2026!";
const superAdminTotpSecret = "JBSWY3DPEHPK3PXP";

const e2eApi = (path: string) => `${apiBaseURL}${path}`;
const signedWebhookHeaders = (payload: unknown) => ({
  "x-mec-webhook-signature": `sha256=${createHmac("sha256", webhookSecret)
    .update(JSON.stringify(payload))
    .digest("hex")}`,
});

async function waitForVerificationLink(request: APIRequestContext, email: string) {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await request.get(e2eApi(`/api/e2e/email-verification-link?email=${encodeURIComponent(email)}`), {
      headers: e2eHeaders,
    });
    lastStatus = response.status();
    lastBody = await response.text();

    if (response.ok()) {
      return JSON.parse(lastBody) as {
        jobId: string;
        jobStatus: string;
        provider: string | null;
        verificationUrl: string;
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Verification link was not available. Last response ${lastStatus}: ${lastBody}`);
}

function base32Decode(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of value.replace(/=+$/g, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
}

async function expectApiOk(request: APIRequestContext, path: string, headers?: Record<string, string>) {
  const response = await request.get(e2eApi(path), { headers });
  expect(response.status(), await response.text()).toBeLessThan(300);
  return response;
}

async function loginClient(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("user lifecycle: browser registration, email trigger, verification link, and login session", async ({ page, request }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-student-${suffix}@example.test`;
  const username = `e2e_student_${suffix.replace(/[^a-z0-9]/gi, "_")}`;

  await page.goto("/register");
  await page.getByLabel("First Name").fill("E2E");
  await page.getByLabel("Last Name").fill("Student");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(strongPassword);
  await page.getByLabel("Confirm Password").fill(strongPassword);
  await page.locator('input[name="acceptTerms"]').check();
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByText("Account created", { exact: true })).toBeVisible({ timeout: 20_000 });
  const verification = await waitForVerificationLink(request, email);
  expect(verification.jobId).toBeTruthy();
  expect(verification.verificationUrl).toContain("/api/auth/verify-email/");

  await page.goto(verification.verificationUrl);
  await expect(page).toHaveURL(/\/login\?verified=1/);
  await loginClient(page, email, strongPassword);

  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();
  const profile = await expectApiOk(request, "/api/user/profile", { Authorization: `Bearer ${token}` });
  const profileBody = await profile.json();
  expect(profileBody.email).toBe(email);
  expect(profileBody.role).toBe("user");
});

test("admin lifecycle: super-admin MFA authentication and users dashboard access", async ({ page, request }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const username = `e2e_super_${suffix.replace(/[^a-z0-9]/gi, "_")}`;
  const email = `${username}@example.test`;

  await request.post(e2eApi("/api/e2e/admin-settings"), {
    headers: e2eHeaders,
    data: { twoFactorRequired: true },
  });
  const seedResponse = await request.post(e2eApi("/api/e2e/users"), {
    headers: e2eHeaders,
    data: {
      email,
      username,
      password: strongPassword,
      firstName: "E2E",
      lastName: "Admin",
      role: "super_admin",
      isActive: true,
      mfaConfirmed: true,
      totpSecret: superAdminTotpSecret,
    },
  });
  expect(seedResponse.status(), await seedResponse.text()).toBeLessThan(300);

  await page.goto(`${adminBaseURL}/admin/auth`);
  await page.getByLabel("Username").fill(username);
  await page.getByPlaceholder("Enter your password").fill(strongPassword);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await page.getByPlaceholder("123456").fill(generateTotpCode(superAdminTotpSecret));
  await page.getByRole("button", { name: /verify mfa code/i }).click();
  await expect(page).toHaveURL(/\/admin(\/dashboard)?$/);

  await page.goto(`${adminBaseURL}/admin/users`);
  await expect(page.getByRole("heading", { name: /users|user management/i })).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();
  const usersResponse = await expectApiOk(request, "/api/admin/users", { Authorization: `Bearer ${token}` });
  const usersBody = await usersResponse.json();
  const users = usersBody.users;
  expect(Array.isArray(users)).toBe(true);
  expect(users.some((user: { email?: string; role?: string }) => user.email === email && user.role === "super_admin")).toBe(true);
});

test("email provider tracking accepts signed SendGrid and SES webhook events", async ({ request }) => {
  const sendGridPayload = [
    {
      event: "delivered",
      email: "tracking-sendgrid@example.test",
      sg_message_id: "sendgrid-e2e-message",
      mec_email_job_id: "sendgrid-e2e-job",
    },
  ];
  const sendGridResponse = await request.post(e2eApi("/api/email/webhooks/sendgrid"), {
    headers: signedWebhookHeaders(sendGridPayload),
    data: sendGridPayload,
  });
  expect(sendGridResponse.status(), await sendGridResponse.text()).toBe(200);

  const sesPayload = {
    eventType: "Delivery",
    mail: { messageId: "ses-e2e-message" },
    tags: { mec_email_job_id: "ses-e2e-job", mec_email_category: "account_verification" },
    recipient: "tracking-ses@example.test",
  };
  const sesResponse = await request.post(e2eApi("/api/email/webhooks/ses"), {
    headers: signedWebhookHeaders(sesPayload),
    data: sesPayload,
  });
  expect(sesResponse.status(), await sesResponse.text()).toBe(200);
});

test("failure simulation surfaces non-silent API and DNS/email readiness failures", async ({ page, request }) => {
  await page.route("**/api/auth/login", (route) => route.abort("failed"));
  await page.goto("/login");
  await page.getByLabel("Email address").fill("offline@example.test");
  await page.getByLabel("Password", { exact: true }).fill(strongPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Login failed", { exact: true })).toBeVisible();
  await page.unroute("**/api/auth/login");

  const health = await expectApiOk(request, "/api/health");
  const healthBody = await health.json();
  expect(healthBody.email.activation).toBeTruthy();
  expect(Array.isArray(healthBody.email.activation.blockingReasons)).toBe(true);

  const metrics = await expectApiOk(request, "/api/metrics");
  expect(await metrics.text()).toContain("app_http_requests_total");
});
