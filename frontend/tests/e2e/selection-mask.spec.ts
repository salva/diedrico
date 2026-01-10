/**
 * E2E tests for Selection Mask System
 * 
 * Tests user-facing behavior:
 * - Only valid elements highlight on hover based on active tool
 * - Invalid elements do not highlight
 * - Dynamic masks change as tool progresses through steps
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Selection Mask System
 */

import { test, expect } from '@playwright/test';

test.describe('Selection Mask System E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for application to load
    await page.waitForSelector('[data-testid="svg-canvas"]', { timeout: 5000 });
  });

  test('PointTool: no elements highlight (empty mask)', async ({ page }) => {
    // Select Point tool
    await page.click('[data-testid="tool-point"]');

    // Create a point first
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });

    // Move mouse over the created point
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200); // Wait for hover state

    // Check that point does NOT have hover class (PointTool has empty mask)
    const pointElement = page.locator('[data-element-type="point"]').first();
    const hasHoverClass = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    
    expect(hasHoverClass).toBe(false);
  });

  test('LineTool: only points highlight', async ({ page }) => {
    // Create initial setup: two points and a line
    await page.click('[data-testid="tool-point"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });
    
    await page.click('[data-testid="tool-line"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });

    // Now test: LineTool should only highlight points, not lines
    await page.click('[data-testid="tool-line"]'); // Activate line tool

    // Hover over point - should highlight
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);
    
    let pointElement = page.locator('[data-element-type="point"]').first();
    let hasHover = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(hasHover).toBe(true);

    // Hover over line - should NOT highlight
    await page.mouse.move(150, 100); // On the line
    await page.waitForTimeout(200);
    
    const lineElement = page.locator('[data-element-type="line"]').first();
    const lineHasHover = await lineElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(lineHasHover).toBe(false);
  });

  test('GuideTool: dynamic mask changes after first selection', async ({ page }) => {
    // Setup: Create points for hinge line
    await page.click('[data-testid="tool-point"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 300 } }); // Hinge point 1
    await page.click('[data-testid="svg-canvas"]', { position: { x: 400, y: 300 } }); // Hinge point 2
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } }); // Regular point

    // Activate guide tool
    await page.click('[data-testid="tool-guide"]');

    // Initial state: both lines and points should be highlightable
    // Hover over hinge line (HalfHingeLine2D)
    await page.mouse.move(250, 300);
    await page.waitForTimeout(200);
    
    const hhlElement = page.locator('[data-element-type="half-hinge-line"]').first();
    const hhlHasHover = await hhlElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(hhlHasHover).toBe(true);

    // Click to select the hinge line
    await page.click('[data-testid="svg-canvas"]', { position: { x: 250, y: 300 } });

    // After selecting line: only points should highlight
    // Hover over point - should highlight
    await page.mouse.move(200, 100);
    await page.waitForTimeout(200);
    
    const pointElement = page.locator('[data-element-type="point"]').first();
    const pointHasHover = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(pointHasHover).toBe(true);

    // Hover back over hinge line - should NOT highlight anymore
    await page.mouse.move(250, 300);
    await page.waitForTimeout(200);
    
    const hhlHasHoverAfter = await hhlElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(hhlHasHoverAfter).toBe(false);
  });

  test('IntersectionTool: only lines highlight', async ({ page }) => {
    // Create setup: points and lines
    await page.click('[data-testid="tool-point"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 200 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 200 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });

    // Create two lines
    await page.click('[data-testid="tool-line"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 200 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 200 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });

    // Activate intersection tool
    await page.click('[data-testid="tool-intersection"]');

    // Hover over line - should highlight
    await page.mouse.move(150, 150);
    await page.waitForTimeout(200);
    
    const lineElement = page.locator('[data-element-type="line"]').first();
    const lineHasHover = await lineElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(lineHasHover).toBe(true);

    // Hover over point - should NOT highlight
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);
    
    const pointElement = page.locator('[data-element-type="point"]').first();
    const pointHasHover = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(pointHasHover).toBe(false);
  });
});
    
    const pointElement = page.locator('[data-element-type="point"]').first();
    const pointHasHover = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(pointHasHover).toBe(true);

    // Click to select source point
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });

    // After selecting point: only guides should highlight
    // Hover over guide - should highlight
    await page.mouse.move(200, 150); // Near guide line
    await page.waitForTimeout(200);
    
    const guideElement = page.locator('[data-element-type="guide"]').first();
    const guideHasHover = await guideElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(guideHasHover).toBe(true);

    // Hover over point - should NOT highlight anymore
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);
    
    const pointHasHoverAfter = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(pointHasHoverAfter).toBe(false);
  });

  test('SegmentTool: only points highlight', async ({ page }) => {
    // Create points
    await page.click('[data-testid="tool-point"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });

    // Create line between them
    await page.click('[data-testid="tool-line"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });

    // Activate segment tool
    await page.click('[data-testid="tool-segment"]');

    // Hover over point - should highlight
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);
    
    const pointElement = page.locator('[data-element-type="point"]').first();
    const pointHasHover = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(pointHasHover).toBe(true);

    // Hover over line - should NOT highlight
    await page.mouse.move(150, 100);
    await page.waitForTimeout(200);
    
    const lineElement = page.locator('[data-element-type="line"]').first();
    const lineHasHover = await lineElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(lineHasHover).toBe(false);
  });

  test('CircleTool: only points highlight', async ({ page }) => {
    // Create points
    await page.click('[data-testid="tool-point"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } });

    // Create circle
    await page.click('[data-testid="tool-circle"]');
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } }); // Center
    await page.click('[data-testid="svg-canvas"]', { position: { x: 200, y: 100 } }); // Radius point

    // Activate circle tool again
    await page.click('[data-testid="tool-circle"]');

    // Hover over point - should highlight
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);
    
    const pointElement = page.locator('[data-element-type="point"]').first();
    const pointHasHover = await pointElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(pointHasHover).toBe(true);

    // Hover over circle - should NOT highlight
    await page.mouse.move(150, 100);
    await page.waitForTimeout(200);
    
    const circleElement = page.locator('[data-element-type="circle"]').first();
    const circleHasHover = await circleElement.evaluate(el => 
      el.classList.contains('hover') || el.classList.contains('hovered')
    );
    expect(circleHasHover).toBe(false);
  });
});
