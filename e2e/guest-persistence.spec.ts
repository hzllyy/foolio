import { test, expect } from "@playwright/test";

test.describe("guest project persistence", () => {
  test("creates a guest project, edits it, and survives a reload with no data loss", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto("/projects/new");
    await expect(page).toHaveURL(/\/projects\/[^/?]+$/);
    await expect(page.getByText("Untitled project")).toBeVisible();
    await expect(page.getByTestId("page-row-page-home")).toBeVisible();

    const projectUrl = page.url();

    // Add a second page.
    await page.getByRole("button", { name: "+ Add page" }).click();
    await expect(page.getByText("New page")).toBeVisible();
    await expect(page.locator('[data-testid^="page-row-"]')).toHaveCount(2);

    // Wait for the debounced snapshot save to settle before reloading.
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5000 });

    await page.reload();
    await expect(page).toHaveURL(projectUrl);
    await expect(page.getByText("Untitled project")).toBeVisible();
    await expect(page.getByText("New page")).toBeVisible();
    await expect(page.locator('[data-testid^="page-row-"]')).toHaveCount(2);
  });
});
