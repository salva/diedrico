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

    const initial = await page.evaluate(() => {
      const svg = document.querySelector("svg.svg-canvas");
      const rect = svg?.getBoundingClientRect();
      return {
        title: document.title,
        svgPresent: Boolean(svg),
        canvasBox: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        gridLineCount: document.querySelectorAll("g.background-grid line").length,
        gridLabelCount: document.querySelectorAll("g.grid-labels text").length,
        pointCount: document.querySelectorAll("svg.svg-canvas circle").length,
        lineCount: document.querySelectorAll("svg.svg-canvas line").length,
        pathCount: document.querySelectorAll("svg.svg-canvas path").length,
        bodyTextSample: document.body.innerText.slice(0, 500)
      };
    });

    if (!initial.svgPresent) throw new Error("svg.svg-canvas not present");
    if (!initial.canvasBox || initial.canvasBox.width < 300 || initial.canvasBox.height < 300) throw new Error(`canvas has unexpected size ${JSON.stringify(initial.canvasBox)}`);
    if (initial.gridLineCount < 5) throw new Error(`expected visible grid lines, found ${initial.gridLineCount}`);
    if (initial.gridLabelCount < 2) throw new Error(`expected grid labels, found ${initial.gridLabelCount}`);

    const pointButton = page.locator("button", { hasText: /^Point$/ }).first();
    const pointButtonCount = await pointButton.count();
    let interaction;
    if (pointButtonCount > 0) {
      await pointButton.click();
      const box = await page.locator("svg.svg-canvas").boundingBox();
      if (!box) throw new Error("svg canvas bounding box unavailable");
      const beforeCircles = await page.locator("svg.svg-canvas circle").count();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      const afterCircles = await page.locator("svg.svg-canvas circle").count();
      interaction = {
        pointButtonFound: true,
        circlesBeforePointClick: beforeCircles,
        circlesAfterPointClick: afterCircles,
        pointRendered: afterCircles > beforeCircles
      };
      if (afterCircles <= beforeCircles) throw new Error(`point creation click did not increase rendered circle count (${beforeCircles} -> ${afterCircles})`);
    } else {
      interaction = { pointButtonFound: false, note: "Point toolbar button not found; DOM canvas/grid/labels smoke only" };
    }

    const severeConsole = consoleMessages.filter(m => /^(error):/i.test(m) && !m.includes("favicon"));
    const output = { status: "ok", initial, interaction, consoleMessages: consoleMessages.slice(-40), pageErrors };
    console.log(JSON.stringify(output, null, 2));
    if (pageErrors.length > 0) throw new Error(`page errors observed: ${pageErrors.join("\n")}`);
    if (severeConsole.length > 0) throw new Error(`console errors observed: ${severeConsole.join("\n")}`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
