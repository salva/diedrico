const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", err => pageErrors.push(err.stack || err.message));
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("svg.svg-canvas", { timeout: 30000 });
  await page.getByLabel("Free Point").click();
  const box = await page.locator("svg.svg-canvas").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1000);
  const snapshot = await page.evaluate(() => ({
    bodyText: document.body.innerText.slice(0, 2000),
    svgOuterStart: document.querySelector("svg.svg-canvas")?.outerHTML.slice(0, 2000) ?? null,
    counts: {
      gridGroups: document.querySelectorAll("g.background-grid").length,
      gridLines: document.querySelectorAll("g.background-grid line").length,
      gridLabelGroups: document.querySelectorAll("g.grid-labels").length,
      gridLabels: document.querySelectorAll("g.grid-labels text").length,
      circles: document.querySelectorAll("svg.svg-canvas circle").length,
      lines: document.querySelectorAll("svg.svg-canvas line").length,
      paths: document.querySelectorAll("svg.svg-canvas path").length
    },
    controls: Array.from(document.querySelectorAll("button")).map(el => ({ aria: el.getAttribute("aria-label"), title: el.getAttribute("title"), className: el.className, text: el.textContent?.trim() })).filter(c => c.className.includes("active") || c.aria === "Free Point" || c.aria === "Selection Tool")
  }));
  console.log(JSON.stringify({ snapshot, consoleMessages, pageErrors }, null, 2));
  await browser.close();
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
