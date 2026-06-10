import { expect, test } from "@playwright/test";

const adminBaseURL = process.env.E2E_ADMIN_BASE_URL || "http://127.0.0.1:5174";

test.describe("Authentication Smoke", () => {
  test("login page renders and shows sign-in call-to-action", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("admin auth page renders", async ({ page }) => {
    await page.goto(`${adminBaseURL}/admin/auth`);
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });
});
