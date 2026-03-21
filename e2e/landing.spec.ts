import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with CTA", async ({ page }) => {
    // Check for a prominent heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Check for a CTA button (e.g. "Get Started" or "Start Free Trial")
    const cta = page.getByRole("link", { name: /get started|start free|sign up/i });
    await expect(cta).toBeVisible();
  });

  test("navbar is visible", async ({ page }) => {
    const nav = page.locator("nav, header");
    await expect(nav.first()).toBeVisible();
  });

  test("pricing section is visible", async ({ page }) => {
    const pricing = page.getByText(/pricing/i).first();
    await expect(pricing).toBeVisible();
  });

  test("FAQ section renders with accordion items", async ({ page }) => {
    const faqHeading = page.getByText(/frequently asked/i);
    await expect(faqHeading).toBeVisible();

    // Check at least one FAQ item exists
    const faqItems = page.locator("details, [data-faq-item]");
    const count = await faqItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("footer renders", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });
});
