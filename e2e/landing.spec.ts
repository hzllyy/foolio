import { test, expect } from "@playwright/test";

test("landing page renders the Foolio wordmark and primary actions", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/foolio/i);
  await expect(page.getByRole("heading", { name: /foolio/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
});
