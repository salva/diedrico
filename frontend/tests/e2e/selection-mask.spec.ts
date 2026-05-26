import { test, expect } from '@playwright/test';

test.describe('Selection mask system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('svg.diedrico-canvas')).toBeVisible();
  });

  test('line tool exposes point-only target flow after point creation', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    await page.getByTestId('tool-point').click();
    await canvas.click({ position: { x: 60, y: 100 } });
    await canvas.click({ position: { x: 120, y: 100 } });

    await page.getByTestId('tool-line').click();
    await expect(page.getByTestId('tool-line')).toHaveClass(/active|selected/);
    expect(await page.locator('svg.diedrico-canvas circle[data-primitive-id^="point-"]').count()).toBeGreaterThanOrEqual(2);
  });

  test('intersection tool can be selected for line-selection masks', async ({ page }) => {
    await page.keyboard.press('i');
    const intersectionTool = page.getByTestId('tool-intersection');
    await expect(intersectionTool).toHaveClass(/active|selected/);
  });
});
