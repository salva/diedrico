/**
 * E2E Test: Line Creation
 * 
 * Tests the complete user workflow for creating lines:
 * 1. User activates Line tool from toolbar
 * 2. User clicks first point (with snapping to existing points)
 * 3. User clicks second point (with snapping)
 * 4. Line appears connecting the two points
 * 5. Line is stored in World data structure
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - US2: Create Points, Lines, Circles
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T052
 */

import { test, expect } from '@playwright/test';

test.describe('Line Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
    // Wait for app to load
    await page.waitForSelector('.svg-canvas');
  });

  test('should create line between two clicked points', async ({ page }) => {
    // Step 1: Create two points first
    const pointToolButton = page.locator('button:has-text("Point")');
    await pointToolButton.click();
    
    const canvas = page.locator('.svg-canvas');
    
    // Create first point
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Create second point
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Verify we have 2 points
    await expect(page.locator('.svg-canvas circle')).toHaveCount(2);
    
    // Step 2: Activate Line tool
    const lineToolButton = page.locator('button:has-text("Line")');
    await expect(lineToolButton).toBeVisible();
    await lineToolButton.click();
    
    // Verify tool is active
    await expect(lineToolButton).toHaveClass(/active/);
    
    // Step 3: Click first point to start line
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Step 4: Click second point to complete line
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Step 5: Verify line appears on canvas
    // Line should be rendered as SVG line element
    const lines = page.locator('.svg-canvas line[data-entity-id^="line_"]');
    await expect(lines).toHaveCount(1);
    
    // Verify line is visible
    const line = lines.first();
    await expect(line).toBeVisible();
  });

  test('should snap to nearby points when creating line', async ({ page }) => {
    // Create two points
    await page.locator('button:has-text("Point")').click();
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Activate Line tool
    await page.locator('button:has-text("Line")').click();
    
    // Click near first point (within snap radius)
    await canvas.click({ position: { x: 205, y: 155 } });
    
    // Click near second point (within snap radius)
    await canvas.click({ position: { x: 395, y: 295 } });
    
    // Line should still be created connecting the actual points
    const lines = page.locator('.svg-canvas line[data-entity-id^="line_"]');
    await expect(lines).toHaveCount(1);
  });

  test('should create multiple lines', async ({ page }) => {
    // Create three points
    await page.locator('button:has-text("Point")').click();
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    await canvas.click({ position: { x: 600, y: 200 } });
    
    await expect(page.locator('.svg-canvas circle')).toHaveCount(3);
    
    // Activate Line tool
    await page.locator('button:has-text("Line")').click();
    
    // Create first line: point 1 to point 2
    await canvas.click({ position: { x: 200, y: 150 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Create second line: point 2 to point 3
    await canvas.click({ position: { x: 400, y: 300 } });
    await canvas.click({ position: { x: 600, y: 200 } });
    
    // Verify we have 2 lines
    const lines = page.locator('.svg-canvas line[data-entity-id^="line_"]');
    await expect(lines).toHaveCount(2);
  });

  test('should highlight points on hover during line creation', async ({ page }) => {
    // Create two points
    await page.locator('button:has-text("Point")').click();
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 200, y: 150 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Activate Line tool
    await page.locator('button:has-text("Line")').click();
    
    // Hover over first point
    await canvas.hover({ position: { x: 200, y: 150 } });
    
    // Wait a moment for hover effect
    await page.waitForTimeout(100);
    
    // Verify point has hover styling (stroke-width should be thicker)
    const points = page.locator('.svg-canvas circle');
    const firstPoint = points.first();
    const strokeWidth = await firstPoint.getAttribute('stroke-width');
    
    // Hover state should have stroke-width of 2
    expect(parseFloat(strokeWidth || '0')).toBeGreaterThan(1.5);
  });

  test('should switch from Point tool to Line tool', async ({ page }) => {
    // Activate Point tool
    const pointToolButton = page.locator('button:has-text("Point")');
    await pointToolButton.click();
    await expect(pointToolButton).toHaveClass(/active/);
    
    // Switch to Line tool
    const lineToolButton = page.locator('button:has-text("Line")');
    await lineToolButton.click();
    
    // Point tool should no longer be active
    await expect(pointToolButton).not.toHaveClass(/active/);
    
    // Line tool should be active
    await expect(lineToolButton).toHaveClass(/active/);
  });
});
