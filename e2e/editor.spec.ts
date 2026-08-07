import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

const FIXTURE_ELEMENT_COUNT = 7;
const FIXTURE_IMAGE_PATH = path.join(__dirname, "..", "legacy", "images", "foolio-icon.PNG");

/**
 * Finds a click point over the canvas stage's own background (not over any fixture element),
 * verified via `elementFromPoint` rather than assumed coordinates — the stage's `.viewport`
 * container clips both rendering and hit-testing to its visible box, so a naive guess can land
 * on a fixture element or outside the visible area.
 */
async function getEmptyStagePoint(page: Page) {
  const point = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="canvas-stage"]');
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    for (let y = rect.top + 20; y < rect.bottom - 20; y += 30) {
      for (let x = rect.left + 20; x < rect.right - 20; x += 30) {
        const el = document.elementFromPoint(x, y);
        if (el && stage.contains(el) && !el.closest("[data-element-id]")) return { x, y };
      }
    }
    return null;
  });
  if (!point) throw new Error("Could not find an empty point on the canvas stage");
  return point;
}

test.describe("editor: builder shell", () => {
  test.beforeEach(async ({ page }) => {
    // The stage's `.viewport` container uses `overflow:auto`, clipping both rendering and
    // hit-testing to its visible box — a small default viewport leaves too little clickable area.
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/dev/editor");
  });

  test("loads the fixture project with all elements rendered and history empty", async ({
    page,
  }) => {
    await expect(page.getByText("Fixture Portfolio")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT);
  });

  test("creating a shape selects it and shows the factory defaults in the inspector", async ({
    page,
  }) => {
    const point = await getEmptyStagePoint(page);
    await page.getByRole("button", { name: "Shape", exact: true }).click();
    await page.mouse.click(point.x, point.y);

    await expect(page.getByText("1 element selected")).toBeVisible();
    await expect(page.locator("aside h2")).toHaveText("Shape");
    await expect(page.getByRole("spinbutton", { name: "Width" })).toHaveValue("160");
    await expect(page.getByRole("spinbutton", { name: "Height" })).toHaveValue("120");
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT + 1);
  });

  test("undo removes a just-created element in a single click while the select tool is active", async ({
    page,
  }) => {
    // Regression test: the select tool's Selecto/Moveable instances mount as soon as the new
    // element is auto-selected. Clicking Undo while they are mounted must not spuriously start a
    // drag on the (about to be deleted) target — it must simply remove the element in one step.
    const point = await getEmptyStagePoint(page);
    await page.getByRole("button", { name: "Shape", exact: true }).click();
    await page.mouse.click(point.x, point.y);
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT + 1);

    await page.getByRole("button", { name: "Undo" }).click();

    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    await expect(page.getByText("Nothing selected")).toBeVisible();
  });

  test("dragging a selected element moves it as one gesture that undo/redo revert and reapply atomically", async ({
    page,
  }) => {
    await page.locator('[data-element-id="hero-group"]').click();
    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toHaveValue("0");
    await expect(page.getByRole("spinbutton", { name: "Y", exact: true })).toHaveValue("0");

    const box = await page.locator('[data-element-id="hero-group"]').boundingBox();
    if (!box) throw new Error("hero-group has no bounding box");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 40, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toHaveValue("60");
    await expect(page.getByRole("spinbutton", { name: "Y", exact: true })).toHaveValue("40");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toHaveValue("0");
    await expect(page.getByRole("spinbutton", { name: "Y", exact: true })).toHaveValue("0");
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toHaveValue("60");
    await expect(page.getByRole("spinbutton", { name: "Y", exact: true })).toHaveValue("40");
    await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  test("resizing a selected element via a Moveable handle updates its dimensions as one undoable step", async ({
    page,
  }) => {
    await page.locator('[data-element-id="hero-group"]').click();
    await expect(page.getByRole("spinbutton", { name: "Width" })).toHaveValue("400");
    await expect(page.getByRole("spinbutton", { name: "Height" })).toHaveValue("240");

    const handles = page.locator(".moveable-control");
    const handleBoxes = await Promise.all(
      (await handles.all()).map((handle) => handle.boundingBox()),
    );
    const bottomRight = handleBoxes.reduce((best, current) => {
      if (!current) return best;
      if (!best || current.x + current.y > best.x + best.y) return current;
      return best;
    }, handleBoxes[0]);
    if (!bottomRight) throw new Error("No Moveable resize handles found");

    const startX = bottomRight.x + bottomRight.width / 2;
    const startY = bottomRight.y + bottomRight.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY + 30, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByRole("spinbutton", { name: "Height" })).toHaveValue("270");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("spinbutton", { name: "Height" })).toHaveValue("240");
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  test("the text, polygon, and pen tools each create and select a new element", async ({
    page,
  }) => {
    const point = await getEmptyStagePoint(page);

    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.mouse.click(point.x, point.y);
    await expect(page.locator("aside h2")).toHaveText("Text");
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT + 1);
    await page.getByRole("button", { name: "Undo" }).click();

    await page.getByRole("button", { name: "Polygon", exact: true }).click();
    await page.mouse.click(point.x, point.y);
    await expect(page.locator("aside h2")).toHaveText("Polygon");
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT + 1);
    await page.getByRole("button", { name: "Undo" }).click();

    await page.getByRole("button", { name: "Pen", exact: true }).click();
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 30, point.y + 10, { steps: 5 });
    await page.mouse.move(point.x + 60, point.y + 40, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator("aside h2")).toHaveText("Path");
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT + 1);
    await page.getByRole("button", { name: "Undo" }).click();

    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  test("the upload tool creates and selects an image element from a chosen file", async ({
    page,
  }) => {
    const point = await getEmptyStagePoint(page);
    await page.getByRole("button", { name: "Upload", exact: true }).click();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.mouse.click(point.x, point.y);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(FIXTURE_IMAGE_PATH);

    await expect(page.locator("aside h2")).toHaveText("Image");
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT + 1);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator("[data-element-id]")).toHaveCount(FIXTURE_ELEMENT_COUNT);
  });
});
