import { test, expect } from '@playwright/test';

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('svg.diedrico-canvas')).toBeVisible();
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
});
