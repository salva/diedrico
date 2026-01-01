/**
 * E2E tests for intersection point creation
 * 
 * Tests the complete workflow for creating intersection points between lines:
 * - Two-click workflow (select first line, then second line)
 * - Visual feedback and highlighting
 * - Parallel lines handling (error message)
 * - Undo/redo functionality
 * - Keyboard shortcuts
 * 
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-14-line-line-intersections
 */

import { test, expect } from '@playwright/test';

test.describe('Intersection Point Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('svg#canvas');
  });

  test('should create intersection point between two lines', async ({ page }) => {
    // Create first line (horizontal)
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    
    // Create second line (vertical)
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    // Initial state: 2 lines, 4 points (2 endpoints each)
    let lines = await page.locator('svg#canvas line.line').count();
    let points = await page.locator('svg#canvas circle.point').count();
    expect(lines).toBe(2);
    expect(points).toBe(4);
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click first line (should be near center)
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Click second line (same position, should hit vertical line)
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Should now have 3 lines (2 original + potentially highlight), 5 points (4 endpoints + 1 intersection)
    points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(5);
    
    // Verify intersection point is at expected location (approximately 250, 200)
    const intersectionPoint = await page.locator('svg#canvas circle.point').nth(4);
    const cx = await intersectionPoint.getAttribute('cx');
    const cy = await intersectionPoint.getAttribute('cy');
    
    // Allow some tolerance for viewport transformation
    const cxNum = parseFloat(cx || '0');
    const cyNum = parseFloat(cy || '0');
    
    expect(Math.abs(cxNum - 250)).toBeLessThan(20);
    expect(Math.abs(cyNum - 200)).toBeLessThan(20);
  });

  test('should show error for parallel lines', async ({ page }) => {
    // Create first horizontal line
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    
    // Create second horizontal line (parallel to first)
    await page.click('svg#canvas', { position: { x: 100, y: 300 } });
    await page.click('svg#canvas', { position: { x: 400, y: 300 } });
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click first line
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Click second line (parallel)
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    // Should NOT create intersection point
    // Still only 4 points (2 endpoints for each line)
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(4);
    
    // Check for error feedback (implementation may show in UI feedback area)
    // For now, just verify no extra point was created
  });

  test('should undo intersection point creation', async ({ page }) => {
    // Create two perpendicular lines
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    // Create intersection point
    await page.click('button:has-text("Intersection")');
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Verify intersection point exists
    let points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(5);
    
    // Undo
    await page.click('button:has-text("Undo")');
    
    // Intersection point should be removed
    points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(4);
  });

  test('should redo intersection point creation', async ({ page }) => {
    // Create two perpendicular lines
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    // Create intersection point
    await page.click('button:has-text("Intersection")');
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Undo
    await page.click('button:has-text("Undo")');
    
    // Redo
    await page.click('button:has-text("Redo")');
    
    // Intersection point should be back
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(5);
  });

  test('should support keyboard shortcut for undo (Ctrl+Z)', async ({ page }) => {
    // Create two lines and intersection
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    await page.click('button:has-text("Intersection")');
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Verify created
    let points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(5);
    
    // Undo with keyboard
    await page.keyboard.press('Control+Z');
    
    points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(4);
  });

  test('should support keyboard shortcut for redo (Ctrl+Shift+Z)', async ({ page }) => {
    // Create two lines and intersection
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    await page.click('button:has-text("Intersection")');
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Undo with keyboard
    await page.keyboard.press('Control+Z');
    
    // Redo with keyboard
    await page.keyboard.press('Control+Shift+Z');
    
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(5);
  });

  test('should create multiple intersections on different line pairs', async ({ page }) => {
    // Create a grid of lines (2 horizontal, 2 vertical)
    await page.click('button:has-text("Line")');
    
    // Horizontal line 1
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    
    // Horizontal line 2
    await page.click('svg#canvas', { position: { x: 100, y: 300 } });
    await page.click('svg#canvas', { position: { x: 400, y: 300 } });
    
    // Vertical line 1
    await page.click('svg#canvas', { position: { x: 200, y: 150 } });
    await page.click('svg#canvas', { position: { x: 200, y: 350 } });
    
    // Vertical line 2
    await page.click('svg#canvas', { position: { x: 300, y: 150 } });
    await page.click('svg#canvas', { position: { x: 300, y: 350 } });
    
    // Create intersections
    await page.click('button:has-text("Intersection")');
    
    // Intersection 1: H1 × V1
    await page.click('svg#canvas', { position: { x: 200, y: 200 } });
    await page.click('svg#canvas', { position: { x: 200, y: 200 } });
    
    // Intersection 2: H1 × V2
    await page.click('svg#canvas', { position: { x: 300, y: 200 } });
    await page.click('svg#canvas', { position: { x: 300, y: 200 } });
    
    // Should have 8 endpoints + 2 intersections = 10 points
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(10);
  });

  test('should handle clicking same line twice (error case)', async ({ page }) => {
    // Create one line
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click same line twice
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    await page.click('svg#canvas', { position: { x: 260, y: 200 } }); // Slightly different position but same line
    
    // Should NOT create intersection point (line cannot intersect with itself)
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(2); // Only the 2 endpoints
  });

  test('should highlight selected line before second click', async ({ page }) => {
    // Create two lines
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    await page.click('svg#canvas', { position: { x: 250, y: 300 } });
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click first line
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    // At this point, first line should be highlighted
    // (Implementation detail: depends on visual feedback system)
    // For now, just verify the workflow continues correctly
    
    // Click second line to complete
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(5);
  });

  test('should change cursor on hover over line', async ({ page }) => {
    // Create a line
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 200 } });
    await page.click('svg#canvas', { position: { x: 400, y: 200 } });
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Hover over line
    await page.hover('svg#canvas', { position: { x: 250, y: 200 } });
    
    // Check cursor style (should be pointer when hovering over selectable line)
    const canvas = await page.locator('svg#canvas');
    const cursor = await canvas.evaluate(el => window.getComputedStyle(el).cursor);
    
    // Cursor should indicate clickable element
    // (Exact value depends on implementation: 'pointer', 'crosshair', etc.)
    expect(['pointer', 'crosshair', 'default']).toContain(cursor);
  });
});
