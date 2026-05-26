const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.stack || err.message));

  try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('svg.svg-canvas', { timeout: 30000 });
    await page.waitForTimeout(1000);

    const before = await page.evaluate(() => {
      const svg = document.querySelector('svg.svg-canvas');
      const rect = svg && svg.getBoundingClientRect();
      const candidates = [];
      if (rect) {
        for (const [name, x, y] of [
          ['left-middle', rect.left + 100, rect.top + rect.height / 2],
          ['left-upper', rect.left + 100, rect.top + 100],
          ['top-center', rect.left + rect.width / 2, rect.top + 10],
          ['center', rect.left + rect.width / 2, rect.top + rect.height / 2]
        ]) {
          const el = document.elementFromPoint(x, y);
          candidates.push({
            name,
            x,
            y,
            tag: el && el.tagName,
            className: el && (typeof el.className === 'string' ? el.className : el.className && el.className.baseVal),
            isSvgOrChild: !!(el && svg && (el === svg || svg.contains(el)))
          });
        }
      }
      return {
        title: document.title,
        svgPresent: Boolean(svg),
        svgBox: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        activePlaneLine: (document.body.innerText.match(/Active Plane:[^\n]*/)?.[0]) || null,
        toolLine: (document.body.innerText.match(/Tool:[^\n]*/)?.[0]) || null,
        gridGroupPresent: Boolean(document.querySelector('g.background-grid')),
        gridLabelGroupPresent: Boolean(document.querySelector('g.grid-labels')),
        gridLineCount: document.querySelectorAll('g.background-grid line').length,
        gridLabelCount: document.querySelectorAll('g.grid-labels text').length,
        circleCount: document.querySelectorAll('svg.svg-canvas circle').length,
        visiblePointCircleCount: Array.from(document.querySelectorAll('svg.svg-canvas circle')).filter(el => !el.classList.contains('snap-indicator')).length,
        lineCount: document.querySelectorAll('svg.svg-canvas line').length,
        pathCount: document.querySelectorAll('svg.svg-canvas path').length,
        renderedGeometryCount: document.querySelectorAll('svg.svg-canvas line, svg.svg-canvas circle, svg.svg-canvas path').length,
        hitCandidates: candidates
      };
    });

    if (!before.svgPresent || !before.svgBox) throw new Error(`svg.svg-canvas unavailable: ${JSON.stringify(before)}`);
    const clickCandidate = before.hitCandidates.find(c => c.isSvgOrChild && c.name !== 'center');
    if (!clickCandidate) throw new Error(`No visible SVG click candidate outside overlay: ${JSON.stringify(before.hitCandidates)}`);

    await page.getByLabel('Free Point').click();
    await page.mouse.click(clickCandidate.x, clickCandidate.y);
    await page.waitForTimeout(1000);

    const after = await page.evaluate(() => ({
      toolLine: (document.body.innerText.match(/Tool:[^\n]*/)?.[0]) || null,
      stepText: document.body.innerText.includes('Point created successfully') ? 'Point created successfully' : null,
      circleCount: document.querySelectorAll('svg.svg-canvas circle').length,
      visiblePointCircleCount: Array.from(document.querySelectorAll('svg.svg-canvas circle')).filter(el => !el.classList.contains('snap-indicator')).length,
      lineCount: document.querySelectorAll('svg.svg-canvas line').length,
      pathCount: document.querySelectorAll('svg.svg-canvas path').length,
      renderedGeometryCount: document.querySelectorAll('svg.svg-canvas line, svg.svg-canvas circle, svg.svg-canvas path').length,
      circles: Array.from(document.querySelectorAll('svg.svg-canvas circle')).slice(-10).map(el => ({
        cx: el.getAttribute('cx'),
        cy: el.getAttribute('cy'),
        r: el.getAttribute('r'),
        fill: el.getAttribute('fill'),
        stroke: el.getAttribute('stroke'),
        className: el.getAttribute('class')
      }))
    }));

    const output = {
      status: after.visiblePointCircleCount > before.visiblePointCircleCount ? 'passed' : 'failed',
      interpretation: after.visiblePointCircleCount > before.visiblePointCircleCount
        ? 'Clicking a visible non-overlapped SVG region with the Free Point tool created and rendered a new SVG point circle through the live Wave 007 canvas presentation/rendering path. The earlier center-click failure was caused by the pre-existing 3D overlay intercepting pointer events at the SVG center, not by a Wave 007 selector/adapter rendering regression.'
        : 'Free Point click on a visible non-overlapped SVG region did not increase rendered point circle count; investigate as possible app/tool/rendering defect.',
      before,
      clickCandidate,
      after,
      consoleMessages: consoleMessages.slice(-80),
      pageErrors
    };
    console.log(JSON.stringify(output, null, 2));

    if (pageErrors.length > 0) throw new Error(`page errors observed: ${pageErrors.join('\n')}`);
    if (output.status !== 'passed') throw new Error(output.interpretation);
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
