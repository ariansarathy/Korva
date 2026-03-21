import { test, expect } from "@playwright/test";

test.describe("Auth Redirects", () => {
  const protectedRoutes = [
    "/dashboard",
    "/analytics",
    "/products",
    "/customers",
    "/settings",
  ];

  for (const route of protectedRoutes) {
    test(`unauthenticated access to ${route} redirects to login`, async ({
      page,
    }) => {
      await page.goto(route);

      // Should redirect to /login
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i).or(
      page.locator('input[type="email"]')
    );
    const passwordInput = page.getByLabel(/password/i).or(
      page.locator('input[type="password"]')
    );

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
