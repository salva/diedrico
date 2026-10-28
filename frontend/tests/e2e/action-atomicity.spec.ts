import { test, expect } from '@playwright/test';

test('history arrow creates and enters atomically; keyboard undo removes only that entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('svg-canvas')).toBeVisible();
  const push = page.getByRole('button', { name: 'Push subprocess to stack', exact: true });
  const pop = page.getByRole('button', { name: 'Pop subprocess from stack', exact: true });
  const nodes = page.locator('.subprocess-header');
  const initial = await nodes.count();
  await push.click();
  await expect(nodes).toHaveCount(initial + 1);
  await pop.click();
  await push.click();
  await expect(nodes).toHaveCount(initial + 2);
  await page.keyboard.press('Control+z');
  await expect(nodes).toHaveCount(initial + 1);
  await expect(pop).toBeDisabled();
  await page.getByTestId('toolbar-redo').click();
  await expect(nodes).toHaveCount(initial + 2);
  await expect(pop).toBeEnabled();
});
