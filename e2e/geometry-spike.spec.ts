import { test, expect } from "@playwright/test";

test("geometry spike selects and drags a box", async ({ page }) => {
  await page.goto("/dev/geometry");

  const box = page.getByTestId("geometry-box-0");
  const before = await box.boundingBox();
  if (!before) throw new Error("box has no bounding box");

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 60, before.y + before.height / 2 + 40, {
    steps: 10,
  });
  await page.mouse.up();

  await expect(box).toHaveAttribute("style", /translate/);
});

test("geometry spike resizes a selected box via a corner handle", async ({ page }) => {
  await page.goto("/dev/geometry");

  const box = page.getByTestId("geometry-box-1");
  await box.click();

  const handle = page.locator(".moveable-control.moveable-se").first();
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("resize handle has no bounding box");

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 50, handleBox.y + 30, { steps: 10 });
  await page.mouse.up();

  await expect(box).toHaveAttribute("style", /width:\s*1[3-9]\d(\.\d+)?px/);
});

test("geometry spike rotates a selected box via the rotation handle", async ({ page }) => {
  await page.goto("/dev/geometry");

  const box = page.getByTestId("geometry-box-2");
  await box.click();

  const handle = page.locator(".moveable-rotation .moveable-control").first();
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("rotation handle has no bounding box");

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 60, handleBox.y + 40, { steps: 10 });
  await page.mouse.up();

  await expect(box).toHaveAttribute("style", /rotate\(/);
});
