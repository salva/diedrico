/**
 * E2E Test: Distance-Adjusted Hit-Testing (Phase 55)
 * 
 * Tests the user workflow for selecting overlapping elements where
 * points get preference due to distance adjustment (points treated as
 * small circles with 5px radius subtracted from distance).
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - FR-040
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - Phase 55
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Distance-Adjusted Hit-Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Distance-Adjusted Hit-Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('svg.diedrico-canvas');
  });

  test('T978: Point highlighted over line when overlapping', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create a point at (150, 150)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 150, y: 150 } });
    
    // Create another point to the right for the line
    await canvas.click({ position: { x: 300, y: 150 } });
    
    // Create a horizontal line through the first point
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 150, y: 150 } }); // First point (on existing)
    await canvas.click({ position: { x: 300, y: 150 } }); // Second point
    
    // Now we have a point at (150, 150) with a line going through it
    
    // Move mouse over the point position
    await canvas.hover({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(100); // Wait for hover to register
    
    // Verify that the POINT is highlighted, not the line
    // Points have hover/highlight styling that should be visible
    const hoveredPoint = page.locator('circle.point-marker[data-hovered="true"]').first();
    await expect(hoveredPoint).toBeVisible();
    
    // Line should not be hovered (point takes precedence due to distance adjustment)
    const hoveredLine = page.locator('line[data-hovered="true"]').first();
    await expect(hoveredLine).not.toBeVisible();
  });

  test('T978: Point selected over line on click', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create a point at (200, 200)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Create another point for the line
    await canvas.click({ position: { x: 350, y: 200 } });
    
    // Create a line through the first point
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 200, y: 200 } }); // Uses existing point
    await canvas.click({ position: { x: 350, y: 200 } }); // Uses existing point
    
    // Switch to selection tool
    await page.getByRole('button', { name: /select/i }).click();
    
    // Click on the overlapping point/line position
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(200);
    
    // Verify POINT is selected (not line)
    const selectedPoint = page.locator('circle.point-marker[data-selected="true"]').first();
    await expect(selectedPoint).toBeVisible();
    
    // Verify selection count is 1 (only the point)
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
  });

  test('T979: Construction workflow with point on line', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Step 1: Create point A at (100, 150)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 100, y: 150 } });
    
    // Step 2: Create point B at (300, 150) - for horizontal line
    await canvas.click({ position: { x: 300, y: 150 } });
    
    // Step 3: Create horizontal line through A and another point
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 100, y: 150 } }); // Point A
    await canvas.click({ position: { x: 300, y: 150 } }); // Point B
    
    // Step 4: Create point C ON the line at (200, 150)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Now we have: Point A, Point B, horizontal line A-B, Point C on the line
    
    // Step 5: Use Line Tool to create line from A to C
    await page.getByRole('button', { name: /line/i }).click();
    
    // Click at A's position
    await canvas.click({ position: { x: 100, y: 150 } });
    await page.waitForTimeout(200);
    
    // Tool should select point A (not the underlying line)
    // Verify by checking tool feedback or state
    
    // Click at C's position
    await canvas.click({ position: { x: 200, y: 150 } });
    await page.waitForTimeout(200);
    
    // Tool should select point C (not the underlying horizontal line)
    // Line A-C should be created successfully
    
    // Verify new line exists (should have 2 lines now: A-B and A-C)
    const lines = page.locator('svg.diedrico-canvas line.line-element');
    await expect(lines).toHaveCount(2);
    
    // Verify line A-C was created (not some spurious line-to-line construction)
    // We can check this by verifying that the new line connects to points A and C
    // (specific verification depends on data attributes in SVG rendering)
  });

  test('T979: Tool input respects distance adjustment', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create construction similar to previous test
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 150, y: 200 } }); // Point A
    await canvas.click({ position: { x: 350, y: 200 } }); // Point B (for line)
    
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 150, y: 200 } }); // Create line through A
    await canvas.click({ position: { x: 350, y: 200 } }); // and B
    
    // Create point ON the line
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 250, y: 200 } }); // Point C on line
    
    // Now use Segment Tool (requires two points)
    await page.getByRole('button', { name: /segment/i }).click();
    
    // Click at A's position - should select point A, not line
    await canvas.click({ position: { x: 150, y: 200 } });
    await page.waitForTimeout(200);
    
    // Click at C's position - should select point C, not line
    await canvas.click({ position: { x: 250, y: 200 } });
    await page.waitForTimeout(200);
    
    // Segment A-C should be created successfully
    const segments = page.locator('svg.diedrico-canvas line.segment-element');
    await expect(segments).toHaveCount(1);
    
    // Verify segment connects correct points (not line endpoints)
    // Specific verification depends on rendered attributes
  });

  test('Line wins when significantly closer than point', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create a point far from where we'll click
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 300, y: 150 } }); // Point far right
    
    // Create a line near where we'll click
    await canvas.click({ position: { x: 100, y: 200 } }); // Point for line
    await canvas.click({ position: { x: 300, y: 200 } }); // Second point
    
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 100, y: 200 } });
    await canvas.click({ position: { x: 300, y: 200 } });
    
    // Switch to selection tool
    await page.getByRole('button', { name: /select/i }).click();
    
    // Click near the line, far from the point
    // Line at y=200, point at (300, 150)
    // Clicking at (200, 200) is ~0px from line, ~50px from point
    // Point adjusted: 50-5=45, Line: 0
    // Line should win
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(200);
    
    // Verify LINE is selected (not point)
    const selectedLine = page.locator('line[data-selected="true"]').first();
    await expect(selectedLine).toBeVisible();
    
    // Point should not be selected
    const selectedPoint = page.locator('circle.point-marker[data-selected="true"]').first();
    await expect(selectedPoint).not.toBeVisible();
  });

  test('Distance adjustment works with hover highlighting', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create overlapping point and line
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 200, y: 250 } }); // Point A
    await canvas.click({ position: { x: 400, y: 250 } }); // Point B for line
    
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 200, y: 250 } });
    await canvas.click({ position: { x: 400, y: 250 } });
    
    // Hover near point A (but not exactly on it)
    // At ~3px away from point, ~3px from line
    // Point adjusted: 3-5=-2, Line: 3
    // Point should be highlighted
    await canvas.hover({ position: { x: 203, y: 250 } });
    await page.waitForTimeout(100);
    
    const hoveredPoint = page.locator('circle.point-marker[data-hovered="true"]').first();
    await expect(hoveredPoint).toBeVisible();
    
    // Move further away from point, still near line
    // At ~10px from point, ~0px from line
    // Point adjusted: 10-5=5, Line: 0
    // Line should be highlighted
    await canvas.hover({ position: { x: 300, y: 250 } });
    await page.waitForTimeout(100);
    
    const hoveredLine = page.locator('line[data-hovered="true"]').first();
    await expect(hoveredLine).toBeVisible();
    
    // Point should no longer be hovered
    await expect(hoveredPoint).not.toBeVisible();
  });
});
