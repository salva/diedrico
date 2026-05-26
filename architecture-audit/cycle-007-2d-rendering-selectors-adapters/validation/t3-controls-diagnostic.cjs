const { chromium } = require("@playwright/test");
(async () => {
 const browser = await chromium.launch({ headless: true });
 const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
 await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle", timeout: 60000 });
 await page.waitForSelector("svg.svg-canvas", { timeout: 30000 });
 const controls = await page.evaluate(() => Array.from(document.querySelectorAll("button,input,select,[role=button]")).map((el, i) => ({
   i,
   tag: el.tagName,
   type: el.getAttribute("type"),
   text: el.textContent?.trim(),
   title: el.getAttribute("title"),
   aria: el.getAttribute("aria-label"),
   cls: el.getAttribute("class"),
   checked: el.checked ?? undefined
 })));
 console.log(JSON.stringify(controls, null, 2));
 await browser.close();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
