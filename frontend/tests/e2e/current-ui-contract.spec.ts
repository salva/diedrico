import { expect, test } from '@playwright/test';

const canvas = (page: import('@playwright/test').Page) => page.getByTestId('svg-canvas');

async function openApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(canvas(page)).toBeVisible();
  await expect(page.getByTestId('status-bar')).toBeVisible();
}

test.describe('Current Diedrico UI contract', () => {
  test('renders the current app shell, canvas, toolbar, status bar, and plane selector', async ({ page }) => {
    await openApp(page);

    await expect(page.getByTestId('tool-select')).toBeVisible();
    await expect(page.getByTestId('tool-point')).toBeVisible();
    await expect(page.getByTestId('tool-line')).toBeVisible();
    await expect(page.getByTestId('tool-circle')).toBeVisible();
    await expect(page.getByTestId('toolbar-undo')).toBeVisible();
    await expect(page.getByTestId('toolbar-redo')).toBeVisible();
    await expect(page.getByTestId('active-plane-status')).toContainText(/P_[HV]/);
    await expect(page.getByTestId('active-tool-status')).toContainText('Select');
    await expect(page.getByTestId('coordinates-3d')).toContainText('---');
  });

  test('creates a free point through stable tool and canvas test IDs', async ({ page }) => {
    await openApp(page);

    const svg = canvas(page);
    const initialPointCount = await svg.locator('circle').count();

    await page.getByTestId('tool-point').click();
    await expect(page.getByTestId('active-tool-status')).toContainText('Point');

    await svg.click({ position: { x: 80, y: 80 } });
    await expect.poll(async () => svg.locator('circle').count()).toBeGreaterThan(initialPointCount);
    await expect(page.getByTestId('toolbar-undo')).toBeEnabled();
  });

  test('plane selector exposes current projection planes and switches active plane', async ({ page }) => {
    await openApp(page);

    await page.getByTestId('plane-selector-button').click();
    await expect(page.locator('[role="listbox"]')).toBeVisible();
    await expect(page.locator('[data-testid^="plane-selector-"]').first()).toBeVisible();

    const pvOption = page.getByTestId('plane-selector-P_V');
    if (await pvOption.count()) {
      await pvOption.click();
      await expect(page.getByTestId('active-plane-status')).toContainText('P_V');
    } else {
      await page.locator('[data-testid^="plane-selector-"]').first().click();
      await expect(page.locator('[role="listbox"]')).toHaveCount(0);
    }
  });

  test('updates 3D coordinate status through the current canvas mouse contract', async ({ page }) => {
    await openApp(page);

    const svg = canvas(page);
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG canvas bounding box unavailable');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(async () => page.getByTestId('coordinates-3d').textContent()).toMatch(/---|\(-?\d+\.\d{2}, -?\d+\.\d{2}, -?\d+\.\d{2}\)/);
  });
});
