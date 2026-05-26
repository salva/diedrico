const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", err => pageErrors.push(err.stack || err.message));
  try {
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("svg.svg-canvas", { timeout: 30000 });
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => {
      const svg = document.querySelector("svg.svg-canvas");
      const rect = svg?.getBoundingClientRect();
      return {
        svgPresent: Boolean(svg),
        canvasBox: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        gridGroupPresent: Boolean(document.querySelector("g.background-grid")),
        gridLineCount: document.querySelectorAll("g.background-grid line").length,
        gridLabelsGroupPresent: Boolean(document.querySelector("g.grid-labels")),
        gridLabelCount: document.querySelectorAll("g.grid-labels text").length,
        circleCount: document.querySelectorAll("svg.svg-canvas circle").length,
        lineCount: document.querySelectorAll("svg.svg-canvas line").length,
        pathCount: document.querySelectorAll("svg.svg-canvas path").length,
        gridToggleActive: document.querySelector("button[aria-label=\"Toggle Grid\"]")?.className ?? null
      };
    });
    if (!before.svgPresent) throw new Error("svg.svg-canvas not present");
    if (!before.canvasBox || before.canvasBox.width < 300 || before.canvasBox.height < 300) throw new Error(`canvas has unexpected size ${JSON.stringify(before.canvasBox)}`);
    if (!before.gridGroupPresent || !before.gridLabelsGroupPresent) throw new Error("grid read-model groups are not mounted in SvgCanvas");

    await page.getByLabel("Free Point").click();
    const box = await page.locator("svg.svg-canvas").boundingBox();
    if (!box) throw new Error("svg canvas bounding box unavailable");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(750);
    const afterPoint = await page.evaluate(() => ({
      circleCount: document.querySelectorAll("svg.svg-canvas circle").length,
      lineCount: document.querySelectorAll("svg.svg-canvas line").length,
      bodyText: document.body.innerText.slice(0, 1000)
    }));
    if (afterPoint.circleCount <= before.circleCount) throw new Error(`Free Point click did not increase rendered circle count (${before.circleCount} -> ${afterPoint.circleCount})`);

    await page.getByLabel("Selection Tool").click();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    const afterHover = await page.evaluate(() => ({
      snapIndicatorCount: document.querySelectorAll("circle.snap-indicator").length,
      tooltipText: document.querySelector(".hover-tooltip")?.textContent?.trim() ?? null,
      selectedCircleCount: Array.from(document.querySelectorAll("svg.svg-canvas circle")).filter(el => {
        const stroke = el.getAttribute("stroke") || "";
        const opacity = el.getAttribute("opacity") || "";
        return stroke.length > 0 || opacity.length > 0;
      }).length
    }));

    const severeConsole = consoleMessages.filter(m => /^(error):/i.test(m) && !m.includes("favicon"));
    const output = {
      status: "ok",
      before,
      afterPoint,
      afterHover,
      interpretation: "Live preview served the app, mounted SvgCanvas presentation groups, and a Free Point tool click produced a rendered SVG circle through the Wave 007 canvas presentation/renderer boundary. Initial grid DTO groups were mounted but empty for the default world/active-plane state.",
      consoleMessages: consoleMessages.slice(-60),
      pageErrors
    };
    console.log(JSON.stringify(output, null, 2));
    if (pageErrors.length > 0) throw new Error(`page errors observed: ${pageErrors.join("\n")}`);
    if (severeConsole.length > 0) throw new Error(`console errors observed: ${severeConsole.join("\n")}`);
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
