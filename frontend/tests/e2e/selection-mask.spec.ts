import { test, expect } from '@playwright/test';

test.describe('Selection mask system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('svg.diedrico-canvas')).toBeVisible();
  });

  test('line tool exposes point-only target flow after point creation', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 100 } });

    await page.getByRole('button', { name: /line/i }).click();
    await expect(page.getByRole('button', { name: /line/i })).toHaveClass(/active|selected/);
    await expect(page.locator('circle.point-marker')).toHaveCount(2);
  });

  test('intersection tool can be selected for line-selection masks', async ({ page }) => {
    const intersectionTool = page.getByRole('button', { name: /intersection/i });
    await intersectionTool.click();
    await expect(intersectionTool).toHaveClass(/active|selected/);
  });
});
