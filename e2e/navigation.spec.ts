import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page has login link that works", async ({ page }) => {
    await page.goto("/");

    const loginLink = page.getByRole("link", { name: /log\s*in|sign\s*in/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("landing page has signup link that works", async ({ page }) => {
    await page.goto("/");

    const signupLink = page.getByRole("link", {
      name: /sign\s*up|get\s*started|start\s*free/i,
    });
    await expect(signupLink).toBeVisible();
    await signupLink.click();

    await expect(page).toHaveURL(/\/(signup|login)/);
  });

  test("/terms page renders", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("body")).toContainText(/terms/i);
  });

  test("/privacy page renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toContainText(/privacy/i);
  });
});
