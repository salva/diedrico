import { test, expect } from '@playwright/test';

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('svg.diedrico-canvas')).toBeVisible();
  });

  test('Tab keeps native toolbar focus traversal without changing the active plane', async ({ page }) => {
    const plane = page.getByTestId('plane-selector');
    const initialPlane = await plane.textContent();
    const select = page.getByTestId('tool-select');
    await select.focus();
    await expect(select).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(select).not.toBeFocused();
    await expect(plane).toHaveText(initialPlane!);
  });

  test('Tab cycles only from the focused drawing canvas', async ({ page }) => {
    const plane = page.getByTestId('plane-selector');
    const initial = await plane.textContent();
    const canvas = page.getByTestId('svg-canvas');
    await canvas.focus();
    await page.keyboard.press('Tab');
    await expect(canvas).toBeFocused();
    await expect(plane).not.toHaveText(initial!);
    await page.keyboard.press('Shift+Tab');
    await expect(plane).toHaveText(initial!);
  });

  test('tool shortcut keys activate current tool buttons', async ({ page }) => {
    const shortcuts = [
      ['p', 'tool-point'],
      ['l', 'tool-line'],
      ['s', 'tool-segment'],
      ['c', 'tool-circle'],
      ['g', 'tool-guide'],
    ] as const;

    for (const [key, testId] of shortcuts) {
      await page.keyboard.press(key);
      await expect(page.getByTestId(testId)).toHaveClass(/active|selected/);
    }
  });

  test('Escape returns to select tool after starting a point workflow', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    await page.keyboard.press('p');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tool-select')).toHaveClass(/active|selected/);
  });

  test('Delete, undo, redo, Escape, and Ctrl+A preserve selection command behavior', async ({ page }) => {
    const canvas = page.getByTestId('svg-canvas');
    const constructionPoints = canvas.locator('circle:not(.snap-indicator)');
    const initialPointCount = await constructionPoints.count();

    await page.keyboard.press('p');
    await canvas.click({ position: { x: 100, y: 100 } });
    await expect.poll(async () => constructionPoints.count()).toBeGreaterThan(initialPointCount);

    const createdPoint = constructionPoints.last();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tool-select')).toHaveClass(/active|selected/);
    await createdPoint.click();
    await expect(createdPoint).toHaveAttribute('stroke', '#0066CC');

    await page.keyboard.press('Control+A');
    await expect(createdPoint).toHaveAttribute('stroke', '#0066CC');
    await page.keyboard.press('Escape');
    await expect(createdPoint).not.toHaveAttribute('stroke', '#0066CC');
    await createdPoint.click();
    await expect(createdPoint).toHaveAttribute('stroke', '#0066CC');

    await page.keyboard.press('Delete');
    await expect.poll(async () => constructionPoints.count()).toBe(initialPointCount);
    await expect(page.getByTestId('toolbar-undo')).toBeEnabled();

    await page.keyboard.press('Control+Z');
    await expect.poll(async () => constructionPoints.count()).toBeGreaterThan(initialPointCount);
    await expect(page.getByTestId('toolbar-redo')).toBeEnabled();

    await page.keyboard.press('Control+Y');
    await expect.poll(async () => constructionPoints.count()).toBe(initialPointCount);
  });
});
