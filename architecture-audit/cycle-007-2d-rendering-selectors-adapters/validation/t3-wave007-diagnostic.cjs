const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", err => pageErrors.push(err.stack || err.message));
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const snapshot = await page.evaluate(() => {
    const svg = document.querySelector("svg.svg-canvas");
    const rect = svg?.getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll("button")).map(b => b.textContent?.trim()).filter(Boolean);
    return {
      url: location.href,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 3000),
      bodyHtmlStart: document.body.innerHTML.slice(0, 3000),
      svgPresent: Boolean(svg),
      canvasBox: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      svgOuterStart: svg ? svg.outerHTML.slice(0, 4000) : null,
      counts: {
        gridGroups: document.querySelectorAll("g.background-grid").length,
        gridLines: document.querySelectorAll("g.background-grid line").length,
        gridLabelsGroup: document.querySelectorAll("g.grid-labels").length,
        gridLabels: document.querySelectorAll("g.grid-labels text").length,
        allSvgLines: document.querySelectorAll("svg.svg-canvas line").length,
        allSvgCircles: document.querySelectorAll("svg.svg-canvas circle").length,
        allSvgPaths: document.querySelectorAll("svg.svg-canvas path").length
      },
      buttons
    };
  });
  console.log(JSON.stringify({ snapshot, consoleMessages, pageErrors }, null, 2));
  await browser.close();
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
