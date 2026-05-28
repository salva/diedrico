const { chromium, expect } = require('/work/diedrico/frontend/node_modules/@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173' });
  await page.goto('/');
  const canvas = page.getByTestId('svg-canvas');
  await canvas.waitFor({ timeout: 15000 });
  await page.getByTestId('status-bar').waitFor({ timeout: 15000 });
  const statusText = await page.getByTestId('status-bar').innerText();
  console.log('startup/status:', statusText.replace(/\s+/g, ' ').trim());

  const initialPointCount = await canvas.locator('circle').count();
  await page.getByTestId('tool-point').click();
  await canvas.click({ position: { x: 80, y: 80 } });
  await expect.poll(async () => canvas.locator('circle').count()).toBeGreaterThan(initialPointCount);
  await page.keyboard.press('Escape');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
  console.log('delete/undo smoke: completed');

  const overlay = page.getByTestId('three-view-overlay');
  await overlay.waitFor({ timeout: 15000 });
  const overlayBox = await overlay.boundingBox();
  if (!overlayBox) throw new Error('3D overlay bounding box unavailable');
  const testPoint = { x: overlayBox.x + overlayBox.width / 2, y: overlayBox.y + overlayBox.height / 2 };
  const ownsHitTesting = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('[data-testid="three-view-overlay"]')), testPoint);
  if (!ownsHitTesting) throw new Error('3D overlay does not own hit testing at center point');
  const viewBoxBefore = await canvas.getAttribute('viewBox');
  await page.mouse.move(testPoint.x, testPoint.y);
  await page.mouse.down();
  await page.mouse.move(testPoint.x - 80, testPoint.y - 40, { steps: 6 });
  await page.mouse.up();
  const viewBoxAfter = await canvas.getAttribute('viewBox');
  if (viewBoxAfter !== viewBoxBefore) throw new Error(`3D overlay drag changed canvas viewBox from ${viewBoxBefore} to ${viewBoxAfter}`);
  console.log('3d overlay pointer smoke: completed');
  await browser.close();
})().catch(async (error) => { console.error(error); process.exit(1); });
