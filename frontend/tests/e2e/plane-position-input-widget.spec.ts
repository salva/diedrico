import { expect, test } from '@playwright/test';

const canvas = (page: import('@playwright/test').Page) => page.getByTestId('svg-canvas');

async function openApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(canvas(page)).toBeVisible();
  await expect(page.getByTestId('status-bar')).toBeVisible();
}

test.describe('Plane position input widget', () => {
  test('creates a point from typed active-plane coordinates', async ({ page }) => {
    await openApp(page);

    const svg = canvas(page);
    const initialPointCount = await svg.locator('circle').count();

    await page.getByTestId('tool-point').click();
    await page.keyboard.type('-20,105');
    await expect(page.getByTestId('plane-position-input')).toHaveValue('-20,105');
    await page.keyboard.press('Enter');

    await expect.poll(async () => svg.locator('circle').count()).toBeGreaterThan(initialPointCount);
    await expect(page.getByTestId('plane-position-input')).toHaveValue('');
    await expect(page.getByTestId('active-tool-status')).toContainText('Point');
  });

  test('keeps tool shortcuts available when coordinate input is blurred', async ({ page }) => {
    await openApp(page);

    await page.getByTestId('tool-point').click();
    await page.keyboard.press('-');
    await expect(page.getByTestId('plane-position-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('plane-position-input')).toHaveValue('');
    await expect(page.getByTestId('plane-position-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('plane-position-input')).not.toBeFocused();

    await page.keyboard.press('L');
    await expect(page.getByTestId('active-tool-status')).toContainText('Line');
  });
});
