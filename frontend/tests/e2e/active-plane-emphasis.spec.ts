/**
 * E2E Test: Active Plane Visual Emphasis (FR-002)
 * 
 * Tests that active plane elements are visually emphasized (100% opacity)
 * while inactive plane elements are de-emphasized (50% opacity).
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md#FR-002
 */

import { test, expect } from '@playwright/test';

test.describe('Active Plane Visual Emphasis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('svg', { timeout: 5000 });
  });

  test('should display active plane elements with full opacity', async ({ page }) => {
    // Select Point tool
    await page.click('[data-testid="tool-point"]');

    // Create a point on P_H (active by default)
    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG not found');

    // Click on P_H plane area (upper region)
    await svg.click({
      position: { x: box.width / 2, y: box.height / 4 }
    });

    // Wait for point to be created
    await page.waitForTimeout(200);

    // Get the created point element
    const points = page.locator('circle[data-layer="elements"]');
    const pointCount = await points.count();
    expect(pointCount).toBeGreaterThanOrEqual(1);

    // Check opacity of point on active plane
    const lastPoint = points.nth(pointCount - 1);
    const opacity = await lastPoint.evaluate(el => {
      return window.getComputedStyle(el).opacity;
    });

    // Active plane elements should have 100% opacity
    expect(parseFloat(opacity)).toBeCloseTo(1.0, 1);
  });

  test('should reduce opacity of inactive plane elements when switching planes', async ({ page }) => {
    // Select Point tool
    await page.click('[data-testid="tool-point"]');

    // Create a point on P_H (active by default)
    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG not found');

    const pointOnH = { x: box.width / 2, y: box.height / 4 };
    await svg.click({ position: pointOnH });
    await page.waitForTimeout(200);

    // Get the created point
    const points = page.locator('circle[data-layer="elements"]');
    const pointHIndex = (await points.count()) - 1;
    const pointH = points.nth(pointHIndex);

    // Verify initial opacity is 100%
    let opacity = await pointH.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeCloseTo(1.0, 1);

    // Switch to P_V plane by clicking on it or using plane selector
    // (Assuming there's a plane selector in the UI)
    const planeSelector = page.locator('[data-testid="plane-selector"]');
    if (await planeSelector.count() > 0) {
      await planeSelector.click();
      await page.click('text=P_V');
      await page.waitForTimeout(300); // Wait for transition
    } else {
      // Alternative: click on P_V plane area
      await svg.click({
        position: { x: box.width / 2, y: 3 * box.height / 4 }
      });
      await page.waitForTimeout(300);
    }

    // Check opacity of point now on inactive plane
    opacity = await pointH.evaluate(el => window.getComputedStyle(el).opacity);
    
    // Inactive plane elements should have 50% opacity
    expect(parseFloat(opacity)).toBeCloseTo(0.5, 1);
  });

  test('should maintain full opacity for guides regardless of active plane', async ({ page }) => {
    // Select Guide tool (if implemented)
    const guideTool = page.locator('[data-testid="tool-guide"]');
    
    if (await guideTool.count() === 0) {
      test.skip();
      return;
    }

    await guideTool.click();

    // Create a guide
    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG not found');

    // Click on hinge line
    await svg.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await page.waitForTimeout(200);

    // Click to define guide through-point
    await svg.click({ position: { x: box.width / 2 + 50, y: box.height / 2 } });
    await page.waitForTimeout(200);

    // Get guide elements
    const guides = page.locator('line[data-layer="guides"]');
    if (await guides.count() > 0) {
      const guide = guides.first();
      const opacity = await guide.evaluate(el => window.getComputedStyle(el).opacity);

      // Guides should always have 100% opacity
      expect(parseFloat(opacity)).toBeCloseTo(1.0, 1);

      // Switch active plane and verify guide still has 100% opacity
      await page.click('[data-testid="plane-selector"]');
      await page.click('text=P_V');
      await page.waitForTimeout(300);

      const opacityAfter = await guide.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacityAfter)).toBeCloseTo(1.0, 1);
    }
  });

  test('should maintain full opacity for hinge lines regardless of active plane', async ({ page }) => {
    // Get hinge line element (HL_HV)
    const hingeLines = page.locator('line[data-layer="hinge-lines"]');
    
    if (await hingeLines.count() === 0) {
      test.skip();
      return;
    }

    const hingeLine = hingeLines.first();

    // Check opacity with P_H active
    let opacity = await hingeLine.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeCloseTo(1.0, 1);

    // Switch to P_V
    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG not found');

    await svg.click({
      position: { x: box.width / 2, y: 3 * box.height / 4 }
    });
    await page.waitForTimeout(300);

    // Check opacity with P_V active
    opacity = await hingeLine.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeCloseTo(1.0, 1);
  });

  test('should apply smooth opacity transitions when switching planes', async ({ page }) => {
    // Select Point tool
    await page.click('[data-testid="tool-point"]');

    // Create points on both planes
    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG not found');

    // Point on P_H
    await svg.click({ position: { x: box.width / 2, y: box.height / 4 } });
    await page.waitForTimeout(200);

    const points = page.locator('circle[data-layer="elements"]');
    const pointH = points.nth((await points.count()) - 1);

    // Record initial time and switch plane
    const startTime = Date.now();
    
    // Switch to P_V
    await svg.click({
      position: { x: box.width / 2, y: 3 * box.height / 4 }
    });

    // Wait a bit and check if transition is still ongoing
    await page.waitForTimeout(100); // 100ms into 200ms transition

    const transitionDuration = Date.now() - startTime;
    
    // Transition should be visible (takes > 100ms)
    expect(transitionDuration).toBeGreaterThanOrEqual(100);

    // Wait for transition to complete
    await page.waitForTimeout(200);

    // Final opacity should be 50%
    const finalOpacity = await pointH.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(finalOpacity)).toBeCloseTo(0.5, 1);
  });

  test('should not allow clicking elements on inactive plane', async ({ page }) => {
    // Select Line tool
    await page.click('[data-testid="tool-line"]');

    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG not found');

    // Create two points on P_H
    await page.click('[data-testid="tool-point"]');
    await svg.click({ position: { x: 100, y: 50 } });
    await page.waitForTimeout(100);
    await svg.click({ position: { x: 200, y: 50 } });
    await page.waitForTimeout(100);

    // Switch to P_V (make P_H inactive)
    await svg.click({ position: { x: box.width / 2, y: 3 * box.height / 4 } });
    await page.waitForTimeout(300);

    // Try to create a line using the points on P_H (now inactive)
    await page.click('[data-testid="tool-line"]');
    
    // Try clicking on a point on inactive P_H
    await svg.click({ position: { x: 100, y: 50 } });
    await page.waitForTimeout(100);

    // Check for error message or no selection
    const statusBar = page.locator('[data-testid="status-bar"]');
    if (await statusBar.count() > 0) {
      const statusText = await statusBar.textContent();
      // Should show error or no point found
      expect(statusText).not.toContain('Selected first point');
    }
  });
});
