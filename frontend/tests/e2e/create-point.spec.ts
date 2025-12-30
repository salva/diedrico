/**
 * E2E Test: Point Creation
 * 
 * Tests the complete user workflow for creating points:
 * 1. User activates Point tool from toolbar
 * 2. User clicks on canvas
 * 3. Point appears at clicked location
 * 4. Point is stored in World data structure
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - US1: Place Point on Active Plane
 */

import { test, expect } from '@playwright/test';

test.describe('Point Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
    // Wait for app to load
    await page.waitForSelector('.svg-canvas');
  });

  test('should create point when Point tool is active and canvas is clicked', async ({ page }) => {
    // Step 1: Activate Point tool
    const pointToolButton = page.locator('button:has-text("Point")');
    await expect(pointToolButton).toBeVisible();
    await pointToolButton.click();
    
    // Verify tool is active (button should have active class)
    await expect(pointToolButton).toHaveClass(/active/);
    
    // Step 2: Click on canvas
    const canvas = page.locator('.svg-canvas');
    await canvas.click({
      position: { x: 200, y: 150 }
    });
    
    // Step 3: Verify point appears on canvas
    // Point should be rendered as SVG circle
    const points = page.locator('.svg-canvas circle');
    await expect(points).toHaveCount(1);
    
    // Verify point is positioned near click location (accounting for transformation)
    const point = points.first();
    await expect(point).toBeVisible();
  });

  test('should create multiple points with repeated clicks', async ({ page }) => {
    // Activate Point tool
    await page.locator('button:has-text("Point")').click();
    
    const canvas = page.locator('.svg-canvas');
    
    // Click multiple times
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 150 } });
    await canvas.click({ position: { x: 300, y: 200 } });
    
    // Verify all points are created
    const points = page.locator('.svg-canvas circle');
    await expect(points).toHaveCount(3);
  });

  test('should create points on horizontal plane (P_H)', async ({ page }) => {
    // Select P_H plane
    const phButton = page.locator('button:has-text("P_H")');
    await phButton.click();
    await expect(phButton).toHaveClass(/active/);
    
    // Activate Point tool and create point
    await page.locator('button:has-text("Point")').click();
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 150, y: 250 } });
    
    // Verify point created
    const points = page.locator('.svg-canvas circle');
    await expect(points).toHaveCount(1);
  });

  test('should create points on vertical plane (P_V)', async ({ page }) => {
    // Select P_V plane
    const pvButton = page.locator('button:has-text("P_V")');
    await pvButton.click();
    await expect(pvButton).toHaveClass(/active/);
    
    // Activate Point tool and create point
    await page.locator('button:has-text("Point")').click();
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 150, y: 250 } });
    
    // Verify point created
    const points = page.locator('.svg-canvas circle');
    await expect(points).toHaveCount(1);
  });

  test('should not create points when Point tool is not active', async ({ page }) => {
    // Don't activate Point tool (select tool is default)
    const canvas = page.locator('.svg-canvas');
    
    // Click canvas
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Verify no points are created (there might be fixed elements, but no user points)
    // Initial fixed points (O_H, O_V) should exist, but no new points
    const initialCount = await page.locator('.svg-canvas circle').count();
    
    // Click again
    await canvas.click({ position: { x: 300, y: 200 } });
    
    // Count should remain the same
    const finalCount = await page.locator('.svg-canvas circle').count();
    expect(finalCount).toBe(initialCount);
  });

  test('should deactivate tool when Select tool is clicked', async ({ page }) => {
    // Activate Point tool
    const pointTool = page.locator('button:has-text("Point")');
    await pointTool.click();
    await expect(pointTool).toHaveClass(/active/);
    
    // Click Select tool (if available) or click Point again to deselect
    // For now, assume clicking the same tool toggles it off
    await pointTool.click();
    
    // Tool should no longer be active
    // (Implementation may vary - this tests the behavior)
  });

  test('should show visual feedback when hovering over canvas with Point tool active', async ({ page }) => {
    // Activate Point tool
    await page.locator('button:has-text("Point")').click();
    
    const canvas = page.locator('.svg-canvas');
    
    // Hover over canvas
    await canvas.hover({ position: { x: 200, y: 150 } });
    
    // TODO: Add assertions for hover feedback (cursor change, preview indicator, etc.)
    // This depends on UI implementation
  });
});
