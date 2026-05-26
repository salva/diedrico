const { chromium } = require('/work/diedrico/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console-error: ${message.text()}`);
  });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  const canvas = page.locator('svg.svg-canvas, svg.diedrico-canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  const box = await canvas.boundingBox();
  const diagnostics = await page.evaluate(() => ({
    title: document.title,
    svgCanvasCount: document.querySelectorAll('svg.svg-canvas, svg.diedrico-canvas').length,
    backgroundGridGroups: document.querySelectorAll('g.background-grid').length,
    gridLabelGroups: document.querySelectorAll('g.grid-labels').length,
    gridLines: document.querySelectorAll('g.background-grid line').length,
    gridLabels: document.querySelectorAll('g.grid-labels text').length,
    renderedPoints: document.querySelectorAll('circle.point-marker, circle[id^="point-"], circle[data-render-kind="point"]').length,
    renderedLines: document.querySelectorAll('line[id^="line-"], path[data-render-kind="line"]').length,
    buttons: Array.from(document.querySelectorAll('button')).map(button => button.textContent?.trim()).filter(Boolean).slice(0, 30),
  }));
  const pointButton = page.getByRole('button', { name: /free point|point/i }).first();
  await pointButton.click({ timeout: 5000 });
  if (box) {
    await canvas.click({ position: { x: Math.floor(box.width / 2), y: Math.floor(box.height / 2) } });
    await page.waitForTimeout(500);
  }
  const afterPoint = await page.evaluate(() => ({
    renderedPoints: document.querySelectorAll('circle.point-marker, circle[id^="point-"], circle[data-render-kind="point"]').length,
    statusText: document.body.innerText.match(/Tool:[^\n]*/)?.[0] || null,
  }));
  console.log(JSON.stringify({ url: page.url(), canvasBox: box, diagnostics, afterPoint, errors }, null, 2));
  await browser.close();
  if (errors.length > 0) process.exitCode = 2;
})();
