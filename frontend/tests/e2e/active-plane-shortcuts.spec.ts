import { test, expect } from '@playwright/test';

test.describe('Active Plane Shortcuts (Phase 89)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('svg.diedrico-canvas');
  });

  test('should cycle active plane with Tab and Shift+Tab', async ({ page }) => {
    const activePlane = page.getByTestId('active-plane-status');

    const initialValue = (await activePlane.textContent())?.trim();
    expect(initialValue).toBeTruthy();

    await page.keyboard.press('Tab');
    await expect(activePlane).not.toHaveText(initialValue ?? '');
    const secondValue = (await activePlane.textContent())?.trim();
    expect(secondValue).toBeTruthy();

    await page.keyboard.press('Shift+Tab');
    await expect(activePlane).toHaveText(initialValue ?? '');

    await page.keyboard.press('Shift+Tab');
    await expect(activePlane).toHaveText(secondValue ?? '');
  });
});
