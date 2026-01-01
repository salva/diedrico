/**
 * E2E tests for guide creation workflow
 * 
 * Tests the complete user journey:
 * 1. Select guide tool
 * 2. Click reference line (hinge line)
 * 3. Click through-point
 * 4. Verify guide rendered as dashed line
 * 5. Test undo/redo
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US3 - Create Guide
 */

import { test, expect } from '@playwright/test';

test.describe('Guide Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.svg-canvas', { timeout: 5000 });
  });

  test('should create guide perpendicular to line through point', async ({ page }) => {
    // 1. Create two points for reference line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // 2. Create reference line
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify line created
    const lines = await page.locator('line[data-element-type="line"]').count();
    expect(lines).toBeGreaterThanOrEqual(1);
    
    // 3. Create through-point above the line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // 4. Select guide tool
    await page.click('button:has-text("Guide")');
    
    // 5. Click reference line
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // 6. Click through-point
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // 7. Verify guide rendered (guides are also rendered as line elements but with different styling)
    // Note: We check total line count increased
    const linesAfter = await page.locator('line[data-element-type="line"]').count();
    expect(linesAfter).toBeGreaterThan(lines);
  });

  test('should render guide with dashed stroke style', async ({ page }) => {
    // Setup: Create reference line and through-point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Create guide
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Find the guide line element (last line added)
    const allLines = await page.locator('line[data-element-type="line"]').all();
    expect(allLines.length).toBeGreaterThan(0);
    
    // Check that at least one line has dashed stroke (guides have stroke-dasharray)
    let hasDashedLine = false;
    for (const line of allLines) {
      const strokeDasharray = await line.getAttribute('stroke-dasharray');
      if (strokeDasharray && strokeDasharray !== 'none') {
        hasDashedLine = true;
        break;
      }
    }
    expect(hasDashedLine).toBe(true);
  });

  test('should undo guide creation', async ({ page }) => {
    // Create reference line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    const linesAfterReferenceLine = await page.locator('line[data-element-type="line"]').count();
    
    // Create through-point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Create guide
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Verify guide exists
    let linesAfterGuide = await page.locator('line[data-element-type="line"]').count();
    expect(linesAfterGuide).toBeGreaterThan(linesAfterReferenceLine);
    
    // Undo guide creation
    await page.click('button[title*="Undo"]');
    
    // Verify guide removed (line count should go back to reference line count)
    const linesAfterUndo = await page.locator('line[data-element-type="line"]').count();
    expect(linesAfterUndo).toBe(linesAfterReferenceLine);
  });

  test('should redo guide creation', async ({ page }) => {
    // Create reference line and through-point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    const linesAfterReferenceLine = await page.locator('line[data-element-type="line"]').count();
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Create guide
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Undo
    await page.click('button[title*="Undo"]');
    
    // Verify guide removed
    let lines = await page.locator('line[data-element-type="line"]').count();
    expect(lines).toBe(linesAfterReferenceLine);
    
    // Redo
    await page.click('button[title*="Redo"]');
    
    // Verify guide restored
    lines = await page.locator('line[data-element-type="line"]').count();
    expect(lines).toBeGreaterThan(linesAfterReferenceLine);
  });

  test('should use keyboard shortcut for undo', async ({ page }) => {
    // Create reference line and guide
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    const linesAfterReferenceLine = await page.locator('line[data-element-type="line"]').count();
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Undo with keyboard (Ctrl+Z on Linux/Windows)
    await page.keyboard.press('Control+z');
    
    // Verify guide removed
    const lines = await page.locator('line[data-element-type="line"]').count();
    expect(lines).toBe(linesAfterReferenceLine);
  });

  test('should create multiple guides on same reference line', async ({ page }) => {
    // Create reference line (horizontal)
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 200, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    const linesAfterReferenceLine = await page.locator('line[data-element-type="line"]').count();
    
    // Create three through-points at different positions
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 250, y: 250 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 350, y: 250 } });
    
    // Create first guide
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 250, y: 250 } });
    
    // Create second guide
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 250 } });
    
    // Create third guide
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 350, y: 250 } });
    
    // Verify three guides created (3 more lines than reference line)
    const linesAfterGuides = await page.locator('line[data-element-type="line"]').count();
    expect(linesAfterGuides).toBe(linesAfterReferenceLine + 3);
  });

  test('should create guide perpendicular to vertical line', async ({ page }) => {
    // Create vertical reference line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 400 } });
    
    await page.click('button:has-text("Line")');
    await page.click('.svg-canvas', { position: { x: 300, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 400 } });
    
    // Create through-point to the right of vertical line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 350, y: 300 } });
    
    // Create guide perpendicular to vertical line
    await page.click('button:has-text("Guide")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.click('.svg-canvas', { position: { x: 350, y: 300 } });
    
    // Verify guide created (should be horizontal, perpendicular to vertical reference)
    const lines = await page.locator('line[data-element-type="line"]').count();
    expect(lines).toBe(2); // Reference line + guide
  });

  test('should require reference line before through-point', async ({ page }) => {
    // Try to create guide without reference line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    await page.click('button:has-text("Guide")');
    
    // First click should fail (no line to select)
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Verify no guide created
    const lines = await page.locator('line[data-element-type="line"]').count();
    expect(lines).toBe(0);
  });
});
