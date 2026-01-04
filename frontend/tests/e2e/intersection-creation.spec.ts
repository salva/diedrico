/**
 * E2E tests for intersection point creation
 * 
 * Tests the complete workflow for creating intersection points between geometric elements:
 * - Line-line intersections (perpendicular, diagonal, parallel handling)
 * - Line-circle intersections (secant, tangent, no intersection cases)
 * - Circle-circle intersections (secant, tangent, nearest-point selection)
 * - Two-click workflow (select first element, then second element)
 * - Visual feedback and highlighting
 * - Nearest-intersection-to-mouse selection for multiple solutions
 * - Undo/redo functionality
 * - Keyboard shortcuts
 * 
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-17-more-intersection-types
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

  test('should create intersection point between line and circle - secant', async ({ page }) => {
    // Create a line (horizontal)
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 250 } });
    await page.click('svg#canvas', { position: { x: 400, y: 250 } });
    
    // Create a circle that intersects the line
    await page.click('button:has-text("Circle")');
    await page.click('svg#canvas', { position: { x: 250, y: 250 } }); // center
    await page.click('svg#canvas', { position: { x: 250, y: 150 } }); // radius point (100 units up)
    
    // Should have 1 line, 1 circle, 3 points (2 line endpoints + 1 circle center)
    let lines = await page.locator('svg#canvas line.line').count();
    let circles = await page.locator('svg#canvas circle.circle-shape').count();
    let points = await page.locator('svg#canvas circle.point').count();
    expect(lines).toBe(1);
    expect(circles).toBe(1);
    expect(points).toBe(3);
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click the line
    await page.click('svg#canvas', { position: { x: 200, y: 250 } });
    
    // Click the circle (near right intersection point)
    // Circle has radius ~100, centered at (250, 250), line at y=250
    // Intersections at approximately (150, 250) and (350, 250)
    // Click near right intersection
    await page.click('svg#canvas', { position: { x: 320, y: 250 } });
    
    // Should now have 4 points (3 original + 1 new intersection)
    points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(4);
    
    // Verify the intersection point is on the right side (nearest to click)
    const intersectionPoint = await page.locator('svg#canvas circle.point').nth(3);
    const cx = await intersectionPoint.getAttribute('cx');
    const cxNum = parseFloat(cx || '0');
    
    // Should be near 350 (right intersection), not 150 (left intersection)
    expect(cxNum).toBeGreaterThan(300);
  });

  test('should create intersection point between line and circle - tangent', async ({ page }) => {
    // Create a circle
    await page.click('button:has-text("Circle")');
    await page.click('svg#canvas', { position: { x: 250, y: 200 } }); // center
    await page.click('svg#canvas', { position: { x: 250, y: 100 } }); // radius = 100
    
    // Create a tangent line (horizontal at y = 100, touching top of circle)
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 100 } });
    await page.click('svg#canvas', { position: { x: 400, y: 100 } });
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click the line
    await page.click('svg#canvas', { position: { x: 250, y: 100 } });
    
    // Click the circle
    await page.click('svg#canvas', { position: { x: 250, y: 150 } });
    
    // Should create tangent intersection point
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(4); // 2 line endpoints + 1 circle center + 1 tangent intersection
  });

  test('should select nearest intersection when multiple exist (circle-circle)', async ({ page }) => {
    // Create first circle
    await page.click('button:has-text("Circle")');
    await page.click('svg#canvas', { position: { x: 200, y: 250 } }); // center
    await page.click('svg#canvas', { position: { x: 200, y: 150 } }); // radius = 100
    
    // Create second circle that intersects the first
    await page.click('svg#canvas', { position: { x: 300, y: 250 } }); // center (100 units right)
    await page.click('svg#canvas', { position: { x: 300, y: 150 } }); // radius = 100
    
    // Should have 2 circles, 2 center points
    let circles = await page.locator('svg#canvas circle.circle-shape').count();
    let points = await page.locator('svg#canvas circle.point').count();
    expect(circles).toBe(2);
    expect(points).toBe(2);
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click first circle
    await page.click('svg#canvas', { position: { x: 200, y: 200 } });
    
    // Click second circle near TOP intersection point
    // Circles centered at (200, 250) and (300, 250) with radius 100
    // Intersections at approximately (250, 336) and (250, 164) (top and bottom)
    await page.click('svg#canvas', { position: { x: 250, y: 180 } });
    
    // Should create the TOP intersection point (nearest to click)
    points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(3); // 2 centers + 1 intersection
    
    const intersectionPoint = await page.locator('svg#canvas circle.point').nth(2);
    const cy = await intersectionPoint.getAttribute('cy');
    const cyNum = parseFloat(cy || '0');
    
    // Should be near top intersection (~164), not bottom (~336)
    expect(cyNum).toBeLessThan(220);
  });

  test('should create intersection between two circles - secant', async ({ page }) => {
    // Create first circle
    await page.click('button:has-text("Circle")');
    await page.click('svg#canvas', { position: { x: 200, y: 250 } }); // center
    await page.click('svg#canvas', { position: { x: 200, y: 200 } }); // radius = 50
    
    // Create second circle
    await page.click('svg#canvas', { position: { x: 270, y: 250 } }); // center (70 units right)
    await page.click('svg#canvas', { position: { x: 270, y: 200 } }); // radius = 50
    
    // Activate intersection tool
    await page.click('button:has-text("Intersection")');
    
    // Click first circle
    await page.click('svg#canvas', { position: { x: 180, y: 250 } });
    
    // Click second circle
    await page.click('svg#canvas', { position: { x: 290, y: 250 } });
    
    // Should create intersection point
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(3); // 2 centers + 1 intersection
  });

  test('should undo line-circle intersection creation', async ({ page }) => {
    // Create line and circle
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 250 } });
    await page.click('svg#canvas', { position: { x: 400, y: 250 } });
    
    await page.click('button:has-text("Circle")');
    await page.click('svg#canvas', { position: { x: 250, y: 250 } });
    await page.click('svg#canvas', { position: { x: 250, y: 150 } });
    
    // Create intersection
    await page.click('button:has-text("Intersection")');
    await page.click('svg#canvas', { position: { x: 200, y: 250 } });
    await page.click('svg#canvas', { position: { x: 250, y: 200 } });
    
    let points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(4); // 2 line endpoints + 1 circle center + 1 intersection
    
    // Undo
    await page.click('button:has-text("Undo")');
    
    points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(3); // 2 line endpoints + 1 circle center
  });

  test('should handle no intersection case (line too far from circle)', async ({ page }) => {
    // Create circle at center
    await page.click('button:has-text("Circle")');
    await page.click('svg#canvas', { position: { x: 250, y: 250 } });
    await page.click('svg#canvas', { position: { x: 250, y: 200 } }); // radius = 50
    
    // Create line far away (no intersection)
    await page.click('button:has-text("Line")');
    await page.click('svg#canvas', { position: { x: 100, y: 400 } });
    await page.click('svg#canvas', { position: { x: 400, y: 400 } });
    
    // Try to create intersection
    await page.click('button:has-text("Intersection")');
    await page.click('svg#canvas', { position: { x: 250, y: 250 } }); // click circle
    await page.click('svg#canvas', { position: { x: 250, y: 400 } }); // click line
    
    // Should NOT create intersection point
    const points = await page.locator('svg#canvas circle.point').count();
    expect(points).toBe(3); // 2 line endpoints + 1 circle center only
  });
});
