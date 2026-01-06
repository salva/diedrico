import { test, expect } from '@playwright/test';

test.describe('Hover Highlighting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should show tooltip when hovering over a point', async ({ page }) => {
    // Create a free point
    await page.click('button:has-text("Free Point")');
    await page.locator('.svg-canvas').click({ position: { x: 300, y: 300 } });
    
    // Wait for the point to be created
    await page.waitForTimeout(200);
    
    // Hover over the point
    await page.locator('.svg-canvas circle[data-testid]').first().hover();
    
    // Wait for tooltip to appear
    await page.waitForTimeout(100);
    
    // Check that tooltip is visible
    const tooltip = page.locator('.hover-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Tooltip should contain element ID or label
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toBeTruthy();
    expect(tooltipText?.length).toBeGreaterThan(0);
  });

  test('should clear tooltip when mouse leaves element', async ({ page }) => {
    // Create a free point
    await page.click('button:has-text("Free Point")');
    await page.locator('.svg-canvas').click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(200);
    
    // Hover over the point
    const point = page.locator('.svg-canvas circle[data-testid]').first();
    await point.hover();
    await page.waitForTimeout(100);
    
    // Verify tooltip is visible
    const tooltip = page.locator('.hover-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Move mouse away
    await page.locator('.svg-canvas').hover({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(100);
    
    // Tooltip should be hidden
    await expect(tooltip).not.toBeVisible();
  });

  test('should apply hover highlight to hovered element', async ({ page }) => {
    // Create a line
    await page.click('button:has-text("Free Point")');
    await page.locator('.svg-canvas').click({ position: { x: 200, y: 200 } });
    await page.locator('.svg-canvas').click({ position: { x: 400, y: 200 } });
    await page.waitForTimeout(200);
    
    await page.click('button:has-text("Line")');
    // Click both points to create line
    await page.locator('.svg-canvas circle[data-testid]').first().click();
    await page.locator('.svg-canvas circle[data-testid]').last().click();
    await page.waitForTimeout(200);
    
    // Get the line element
    const line = page.locator('.svg-canvas line[data-testid]').first();
    
    // Get initial stroke color (should be normal state)
    const initialStroke = await line.getAttribute('stroke');
    
    // Hover over the line
    await line.hover();
    await page.waitForTimeout(100);
    
    // Get hover stroke color (should be hover highlight color)
    const hoverStroke = await line.getAttribute('stroke');
    
    // Stroke should change on hover (hover color is #4A90E2)
    expect(hoverStroke).not.toBe(initialStroke);
  });

  test('should distinguish hover from selection highlight', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Free Point")');
    await page.locator('.svg-canvas').click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(200);
    
    const point = page.locator('.svg-canvas circle[data-testid]').first();
    
    // Hover over the point (not selected)
    await point.hover();
    await page.waitForTimeout(100);
    const hoverStroke = await point.getAttribute('stroke');
    
    // Click to select the point
    await point.click();
    await page.waitForTimeout(100);
    
    // Get selection stroke color
    const selectionStroke = await point.getAttribute('stroke');
    
    // Selection highlight should be different from hover highlight
    // Hover: #4A90E2, Selection: #0066CC
    expect(selectionStroke).not.toBe(hoverStroke);
  });

  test('should show hover tooltip for different element types', async ({ page }) => {
    // Create multiple elements
    // 1. Free point
    await page.click('button:has-text("Free Point")');
    await page.locator('.svg-canvas').click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(100);
    
    // 2. Another point for line
    await page.locator('.svg-canvas').click({ position: { x: 400, y: 200 } });
    await page.waitForTimeout(100);
    
    // 3. Create line
    await page.click('button:has-text("Line")');
    const points = page.locator('.svg-canvas circle[data-testid]');
    await points.first().click();
    await points.last().click();
    await page.waitForTimeout(200);
    
    // Test hover tooltip on line
    const line = page.locator('.svg-canvas line[data-testid]').first();
    await line.hover();
    await page.waitForTimeout(100);
    
    const tooltip = page.locator('.hover-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Move to point and verify tooltip updates
    await points.first().hover();
    await page.waitForTimeout(100);
    
    await expect(tooltip).toBeVisible();
    // Tooltip text should have changed
    const pointTooltip = await tooltip.textContent();
    expect(pointTooltip).toBeTruthy();
  });

  test('selection highlight should take precedence over hover', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Free Point")');
    await page.locator('.svg-canvas').click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(200);
    
    const point = page.locator('.svg-canvas circle[data-testid]').first();
    
    // Select the point
    await point.click();
    await page.waitForTimeout(100);
    
    // Get selected stroke color
    const selectedStroke = await point.getAttribute('stroke');
    
    // Hover over the selected point (both states active)
    await point.hover();
    await page.waitForTimeout(100);
    
    // Stroke should still be selection color (selection takes precedence)
    const hoveredSelectedStroke = await point.getAttribute('stroke');
    expect(hoveredSelectedStroke).toBe(selectedStroke);
    
    // Should be selection blue (#0066CC) not hover blue (#4A90E2)
    expect(selectedStroke?.toLowerCase()).toContain('006');
  });
});
