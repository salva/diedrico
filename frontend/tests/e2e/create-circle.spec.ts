/**
 * E2E tests for circle creation workflow
 * 
 * Tests the complete user journey:
 * 1. Select circle tool
 * 2. Click center point
 * 3. Click to set radius
 * 4. Verify circle rendered
 * 5. Test undo/redo
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2 - Create circles
 */

import { test, expect } from '@playwright/test';

test.describe('Circle Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.svg-canvas', { timeout: 5000 });
  });

  test('should create circle with center and radius', async ({ page }) => {
    // 1. Create center point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Verify point created
    const points = await page.locator('circle[data-element-type="point"]').count();
    expect(points).toBeGreaterThanOrEqual(1);
    
    // 2. Select circle tool
    await page.click('button:has-text("Circle")');
    
    // 3. Click center point
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // 4. Click to set radius (100 pixels away)
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // 5. Verify circle rendered
    const circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBeGreaterThanOrEqual(1);
    
    // Verify circle has non-zero radius
    const circleElement = page.locator('circle[data-element-type="circle"]').first();
    const radius = await circleElement.getAttribute('r');
    expect(parseFloat(radius!)).toBeGreaterThan(0);
  });

  test('should undo circle creation', async ({ page }) => {
    // Create point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Create circle
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify circle exists
    let circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBeGreaterThanOrEqual(1);
    
    // Undo circle creation
    await page.click('button[title*="Undo"]');
    
    // Verify circle removed
    circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(0);
  });

  test('should redo circle creation', async ({ page }) => {
    // Create point and circle
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Undo
    await page.click('button[title*="Undo"]');
    
    // Verify circle removed
    let circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(0);
    
    // Redo
    await page.click('button[title*="Redo"]');
    
    // Verify circle restored
    circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBeGreaterThanOrEqual(1);
  });

  test('should use keyboard shortcut for undo', async ({ page }) => {
    // Create point and circle
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Undo with keyboard (Ctrl+Z on Linux/Windows, Cmd+Z on Mac)
    await page.keyboard.press('Control+z');
    
    // Verify circle removed
    const circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(0);
  });

  test('should create multiple circles', async ({ page }) => {
    // Create three points
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 350 } });
    
    // Create first circle
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 250, y: 200 } });
    
    // Create second circle
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 450, y: 200 } });
    
    // Create third circle
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 350 } });
    await page.click('.svg-canvas', { position: { x: 350, y: 350 } });
    
    // Verify three circles rendered
    const circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(3);
  });

  test('should create circles on different planes', async ({ page }) => {
    // Create point on horizontal plane
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 200 } });
    
    // Create circle on horizontal plane
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 350, y: 200 } });
    
    // Switch to vertical plane
    await page.click('button:has-text("Vertical")');
    
    // Create point on vertical plane
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 600 } });
    
    // Create circle on vertical plane
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 600 } });
    await page.click('.svg-canvas', { position: { x: 350, y: 600 } });
    
    // Verify two circles rendered
    const circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(2);
  });

  test('should reject circle with zero radius', async ({ page }) => {
    // Create point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Try to create circle by clicking center twice (zero radius)
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Verify no circle created
    const circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(0);
  });

  test('should create circles with different radii', async ({ page }) => {
    // Create center point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Create small circle (radius ~25 pixels)
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 325, y: 300 } });
    
    // Create medium circle (radius ~50 pixels)
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 350, y: 300 } });
    
    // Create large circle (radius ~100 pixels)
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify three circles with different radii
    const circles = await page.locator('circle[data-element-type="circle"]').all();
    expect(circles.length).toBe(3);
    
    // Get radii and verify they're different and increasing
    const radii = await Promise.all(
      circles.map(async (circle) => parseFloat((await circle.getAttribute('r'))!))
    );
    
    expect(radii[0]).toBeLessThan(radii[1]);
    expect(radii[1]).toBeLessThan(radii[2]);
  });

  test('should display circle with distinct visual style', async ({ page }) => {
    // Create point and circle
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify circle has stroke but no fill
    const circleElement = page.locator('circle[data-element-type="circle"]').first();
    const stroke = await circleElement.getAttribute('stroke');
    const fill = await circleElement.getAttribute('fill');
    
    // Circle should have stroke (blue #1E88E5)
    expect(stroke).toBeTruthy();
    // Circle should have no fill
    expect(fill).toBe('none');
  });

  test('should require center point to exist', async ({ page }) => {
    // Try to create circle without creating center point first
    await page.click('button:has-text("Circle")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Should fail - no error, just no action since no point to snap to
    // Click again to try radius
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify no circle created
    const circles = await page.locator('circle[data-element-type="circle"]').count();
    expect(circles).toBe(0);
  });
});
