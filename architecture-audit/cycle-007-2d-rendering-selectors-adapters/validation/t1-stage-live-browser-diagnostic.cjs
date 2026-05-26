const { chromium } = require('/work/diedrico/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console-error: ${m.text()}`); });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('svg.svg-canvas, svg.diedrico-canvas').first().waitFor({ state: 'visible', timeout: 15000 });
  const result = await page.evaluate(() => {
    const svg = document.querySelector('svg.svg-canvas, svg.diedrico-canvas');
    const r = svg?.getBoundingClientRect();
    const center = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return {
      title: document.title,
      svgBox: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
      centerHitElement: center ? { tag: center.tagName, className: String(center.getAttribute('class') || ''), dataEngine: center.getAttribute('data-engine') } : null,
      svgCanvasCount: document.querySelectorAll('svg.svg-canvas, svg.diedrico-canvas').length,
      backgroundGridGroups: document.querySelectorAll('g.background-grid').length,
      gridLabelGroups: document.querySelectorAll('g.grid-labels').length,
      gridLines: document.querySelectorAll('g.background-grid line').length,
      gridLabels: document.querySelectorAll('g.grid-labels text').length,
      renderedGeometry: document.querySelectorAll('circle, line, path').length,
      toolbarButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 40),
      bodyToolLine: document.body.innerText.match(/Tool:[^\n]*/)?.[0] || null,
    };
  });
  console.log(JSON.stringify({ result, errors }, null, 2));
  await browser.close();
})();
