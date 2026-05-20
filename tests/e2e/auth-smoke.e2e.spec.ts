import { expect, test } from "@playwright/test";

test.describe("Authentication Smoke", () => {
  test("login page renders and shows sign-in call-to-action", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("admin auth page renders", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/admin management platform/i)).toBeVisible();
  });
});
