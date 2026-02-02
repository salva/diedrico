import { test } from '@playwright/test';

test('debug console', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('requestfailed', request => console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() === 404) console.log(`RESPONSE 404: ${response.url()}`);
  });
  page.on('pageerror', exception => console.log(`In-page error: "${exception}"`));
  
  await page.goto('http://localhost:5180');
  
  // Check if svg exists
  const count = await page.locator('svg').count();
  console.log('SVG count:', count);
  const visible = await page.locator('svg').isVisible();
  console.log('SVG visible:', visible);
  const classes = await page.locator('svg').getAttribute('class');
  console.log('SVG class:', classes);

  await page.waitForTimeout(5000);
});
