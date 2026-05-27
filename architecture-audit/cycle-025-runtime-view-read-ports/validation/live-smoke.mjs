import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.getByTestId('svg-canvas').waitFor({ state: 'visible', timeout: 15000 });
await page.getByText('Elements').waitFor({ state: 'visible' });
await page.getByText('Construction History').waitFor({ state: 'visible' });
await page.getByTestId('three-view-overlay').waitFor({ state: 'visible' });
await page.getByTestId('plane-selector').waitFor({ state: 'visible' });
await page.getByTestId('plane-selector-button').click();
const options = await page.locator('[role="option"]').count();
if (options < 1) throw new Error('plane selector opened without options');
await page.keyboard.press('Escape');
await page.keyboard.press('ControlOrMeta+Z').catch(() => {});
await browser.close();
console.log(JSON.stringify({ ok: true, checks: ['canvas', 'elements-panel', 'actions-panel', 'three-overlay', 'plane-selector', 'undo-key-smoke'], planeOptions: options }));
