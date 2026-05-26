const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('svg.svg-canvas', { timeout: 30000 });
    await page.waitForTimeout(1000);
    const result = await page.evaluate(() => {
      const svg = document.querySelector('svg.svg-canvas');
      const keys = svg ? Object.keys(svg).filter(k => k.includes('vue') || k.includes('__')) : [];
      const inst = svg && (svg.__vueParentComponent || svg.__vue_app__);
      const parentChain = [];
      let cur = svg && svg.__vueParentComponent;
      for (let i = 0; cur && i < 8; i++) {
        parentChain.push({
          i,
          typeName: cur.type && (cur.type.name || cur.type.__name || cur.type.__file),
          setupKeys: cur.setupState ? Object.keys(cur.setupState).slice(0, 80) : [],
          ctxKeys: cur.ctx ? Object.keys(cur.ctx).slice(0, 80) : [],
          providesKeys: cur.provides ? Object.keys(cur.provides).slice(0, 80) : []
        });
        cur = cur.parent;
      }
      return { keys, hasInst: !!inst, parentChain };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
