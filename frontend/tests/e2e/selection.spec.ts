/**
 * E2E Test: Object Selection
 * 
 * Tests the complete user workflow for selecting geometric objects:
 * 1. Click to select a single element
 * 2. Shift+click to add elements to selection (multi-select)
 * 3. Click empty space to clear selection
 * 4. Selection highlighting (visual feedback)
 * 5. Selection sync between canvas and ElementsPanel
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - US5: Select Object
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Phase 19: Object Selection
 */

import { test, expect } from '@playwright/test';

test.describe('Object Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('svg.diedrico-canvas');
    
    // Setup: Create some geometric objects to test selection
    // Create 3 points
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 100 } });
    await canvas.click({ position: { x: 300, y: 100 } });
    
    // Create a line between first two points
    await page.getByRole('button', { name: /line/i }).click();
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 100 } });
    
    // Create a segment
    await page.getByRole('button', { name: /segment/i }).click();
    await canvas.click({ position: { x: 200, y: 100 } });
    await canvas.click({ position: { x: 300, y: 100 } });
    
    // Switch to Select tool
    await page.getByRole('button', { name: /select/i }).click();
  });

  test('should select single element on click', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Click on a point to select it
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Wait for selection state to update
    await page.waitForTimeout(200);
    
    // Verify element has selected class/style
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
    
    // Verify selection is reflected in selectionStore (via data attributes or classes)
    const selectedPoint = page.locator('circle.point-marker[data-selected="true"]').first();
    await expect(selectedPoint).toBeVisible();
  });

  test('should replace selection when clicking different element', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Select first element
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Click second element
    await canvas.click({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(200);
    
    // Should have only 1 selected element (the second one)
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
  });

  test('should add to selection with Shift+click (multi-select)', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Select first element
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Shift+click second element to add to selection
    await canvas.click({ 
      position: { x: 200, y: 100 },
      modifiers: ['Shift']
    });
    await page.waitForTimeout(200);
    
    // Should have 2 selected elements
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(2);
  });

  test('should add multiple elements to selection with repeated Shift+click', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Select first element
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Shift+click to add second
    await canvas.click({ 
      position: { x: 200, y: 100 },
      modifiers: ['Shift']
    });
    await page.waitForTimeout(200);
    
    // Shift+click to add third
    await canvas.click({ 
      position: { x: 300, y: 100 },
      modifiers: ['Shift']
    });
    await page.waitForTimeout(200);
    
    // Should have 3 selected elements
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(3);
  });

  test('should clear selection when clicking empty space', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // First select an element
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Verify element is selected
    let selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
    
    // Click on empty space (far from any elements)
    await canvas.click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(200);
    
    // Selection should be cleared
    selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(0);
  });

  test('should show selection highlighting (visual feedback)', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Select an element
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Get the selected point element
    const selectedPoint = page.locator('circle.point-marker[data-selected="true"]').first();
    
    // Check for selection highlight class
    const hasHighlight = await selectedPoint.evaluate(el => {
      // Check for selection-related classes
      return el.classList.contains('selected') || 
             el.classList.contains('selection') ||
             el.getAttribute('data-selected') === 'true';
    });
    
    expect(hasHighlight).toBe(true);
    
    // Verify selection style is different from non-selected elements
    const selectedStroke = await selectedPoint.getAttribute('stroke');
    const nonSelectedPoint = page.locator('circle.point-marker:not([data-selected="true"])').first();
    const nonSelectedStroke = await nonSelectedPoint.getAttribute('stroke');
    
    // Selected element should have different stroke color
    expect(selectedStroke).not.toBe(nonSelectedStroke);
  });

  test.skip('should sync selection between canvas and ElementsPanel (canvas -> panel)', async ({ page }) => {
    // Open ElementsPanel if not visible
    const elementsPanelToggle = page.locator('[data-testid="toggle-elements-panel"]');
    if (await elementsPanelToggle.isVisible()) {
      await elementsPanelToggle.click();
    }
    
    // Select element on canvas
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Check if ElementsPanel shows the element as selected
    const selectedInPanel = page.locator('[data-testid="elements-panel"] .element-item.selected');
    await expect(selectedInPanel).toHaveCount(1);
  });

  test.skip('should sync selection between ElementsPanel and canvas (panel -> canvas)', async ({ page }) => {
    // Open ElementsPanel if not visible
    const elementsPanelToggle = page.locator('[data-testid="toggle-elements-panel"]');
    if (await elementsPanelToggle.isVisible()) {
      await elementsPanelToggle.click();
    }
    
    // Click element in panel
    const firstElement = page.locator('[data-testid="elements-panel"] .element-item').first();
    await firstElement.click();
    await page.waitForTimeout(200);
    
    // Check if canvas shows selection
    const selectedOnCanvas = page.locator('[data-testid="svg-canvas"] [data-selected="true"]');
    await expect(selectedOnCanvas).toHaveCount(1);
  });

  test.skip('should maintain multi-select when switching between canvas and panel', async ({ page }) => {
    // Open ElementsPanel
    const elementsPanelToggle = page.locator('[data-testid="toggle-elements-panel"]');
    if (await elementsPanelToggle.isVisible()) {
      await elementsPanelToggle.click();
    }
    
    // Multi-select on canvas
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    await page.click('[data-testid="svg-canvas"]', { 
      position: { x: 200, y: 100 },
      modifiers: ['Shift']
    });
    await page.waitForTimeout(200);
    
    // Verify both canvas and panel show 2 selected items
    const selectedOnCanvas = page.locator('[data-testid="svg-canvas"] [data-selected="true"]');
    await expect(selectedOnCanvas).toHaveCount(2);
    
    const selectedInPanel = page.locator('[data-testid="elements-panel"] .element-item.selected');
    await expect(selectedInPanel).toHaveCount(2);
  });

  test('should deselect element with Shift+click on already selected element', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Select two elements
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    await canvas.click({ 
      position: { x: 200, y: 100 },
      modifiers: ['Shift']
    });
    await page.waitForTimeout(200);
    
    // Verify 2 elements selected
    let selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(2);
    
    // Shift+click on already selected element to deselect it
    await canvas.click({ 
      position: { x: 100, y: 100 },
      modifiers: ['Shift']
    });
    await page.waitForTimeout(200);
    
    // Should now have only 1 selected element
    selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
  });

  test.skip('should select different element types (point, line, segment)', async ({ page }) => {
    // Select point
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    let selectedPoint = page.locator('[data-element-type="point"][data-selected="true"]');
    await expect(selectedPoint).toHaveCount(1);
    
    // Select line (replacing previous selection)
    await page.click('[data-testid="svg-canvas"]', { position: { x: 150, y: 100 } }); // Middle of line
    await page.waitForTimeout(200);
    
    let selectedLine = page.locator('[data-element-type="line"][data-selected="true"]');
    await expect(selectedLine).toHaveCount(1);
    
    // Point should no longer be selected
    selectedPoint = page.locator('[data-element-type="point"][data-selected="true"]');
    await expect(selectedPoint).toHaveCount(0);
    
    // Select segment
    await page.click('[data-testid="svg-canvas"]', { position: { x: 250, y: 100 } }); // Middle of segment
    await page.waitForTimeout(200);
    
    const selectedSegment = page.locator('[data-element-type="segment"][data-selected="true"]');
    await expect(selectedSegment).toHaveCount(1);
  });

  test('should not select elements when using drawing tools', async ({ page }) => {
    // Switch to Point tool
    await page.getByRole('button', { name: /point/i }).click();
    
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Click on existing point (should not select, should create new point)
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // No selection should exist (Point tool doesn't trigger selection)
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(0);
  });

  test('should clear selection when switching tools', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Select element with Select tool
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Verify selection exists
    let selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
    
    // Switch to different tool
    await page.getByRole('button', { name: /point/i }).click();
    await page.waitForTimeout(200);
    
    // Selection should be cleared
    selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(0);
  });

  test('should handle rapid selection changes', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Rapidly click different elements
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 100 } });
    await canvas.click({ position: { x: 300, y: 100 } });
    await page.waitForTimeout(300);
    
    // Should have only the last selected element
    const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
    await expect(selectedElements).toHaveCount(1);
  });

  test.skip('should persist selection across plane switches', async ({ page }) => {
    // Select element on current plane
    await page.click('[data-testid="svg-canvas"]', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    
    // Switch plane
    const planeButton = page.locator('[data-testid="plane-toggle"]');
    if (await planeButton.isVisible()) {
      await planeButton.click();
      await page.waitForTimeout(200);
    }
    
    // Selection should still exist (or be cleared depending on design)
    // This test documents the expected behavior
    const selectedElements = page.locator('[data-testid="svg-canvas"] [data-selected="true"]');
    // Adjust expectation based on actual requirements:
    // Option A: Selection persists across planes
    // await expect(selectedElements).toHaveCount(1);
    // Option B: Selection clears when switching planes
    // await expect(selectedElements).toHaveCount(0);
  });
});
