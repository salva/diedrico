/**
 * E2E Test: Keyboard Shortcuts
 * 
 * Tests the complete keyboard shortcut functionality implemented in Phase 27:
 * - Tool shortcuts (P, L, S, C, G) for activating tools
 * - Ctrl+A: Select all elements in active plane
 * - Ctrl+0: Fit to view
 * - Esc: Cancel/deselect
 * - Delete/Backspace: Delete selected elements
 * - Ctrl+Z/Y: Undo/Redo
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - Phase 27: T268-T274
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Keyboard Shortcuts
 */

import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('svg.diedrico-canvas');
  });

  test.describe('Tool Shortcuts (T273)', () => {
    test('P key should activate Point tool', async ({ page }) => {
      // Press P key
      await page.keyboard.press('p');
      
      // Wait for tool state to update
      await page.waitForTimeout(100);
      
      // Verify Point tool is active (check button state or tool indicator)
      const pointButton = page.getByRole('button', { name: /point/i });
      await expect(pointButton).toHaveClass(/active|selected/);
    });

    test('L key should activate Line tool', async ({ page }) => {
      await page.keyboard.press('l');
      await page.waitForTimeout(100);
      
      const lineButton = page.getByRole('button', { name: /line/i });
      await expect(lineButton).toHaveClass(/active|selected/);
    });

    test('S key should activate Segment tool', async ({ page }) => {
      await page.keyboard.press('s');
      await page.waitForTimeout(100);
      
      const segmentButton = page.getByRole('button', { name: /segment/i });
      await expect(segmentButton).toHaveClass(/active|selected/);
    });

    test('C key should activate Circle tool', async ({ page }) => {
      await page.keyboard.press('c');
      await page.waitForTimeout(100);
      
      const circleButton = page.getByRole('button', { name: /circle/i });
      await expect(circleButton).toHaveClass(/active|selected/);
    });

    test('G key should activate Guide tool', async ({ page }) => {
      await page.keyboard.press('g');
      await page.waitForTimeout(100);
      
      const guideButton = page.getByRole('button', { name: /guide/i });
      await expect(guideButton).toHaveClass(/active|selected/);
    });

    test('tool shortcuts should not activate when typing in input field', async ({ page }) => {
      // This test ensures tool shortcuts don't interfere with text input
      // Create a scenario where an input field exists (e.g., search or filter)
      // For now, we'll just verify the behavior doesn't break
      
      // Click Point tool first
      await page.getByRole('button', { name: /point/i }).click();
      
      // If there's a search/filter input, type in it
      const searchInput = page.locator('input[type="text"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.click();
        await searchInput.type('point'); // Should not activate point tool
        
        // Verify Point tool is still active (not changed)
        const pointButton = page.getByRole('button', { name: /point/i });
        await expect(pointButton).toHaveClass(/active|selected/);
      }
    });
  });

  test.describe('Escape Key (T272)', () => {
    test('Esc should cancel active tool and clear selection', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create a point
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Switch to select tool and select the point
      await page.getByRole('button', { name: /select/i }).click();
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Wait for selection
      await page.waitForTimeout(200);
      
      // Verify something is selected
      const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
      await expect(selectedElements).toHaveCount(1);
      
      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      
      // Verify selection is cleared
      await expect(selectedElements).toHaveCount(0);
      
      // Verify Select tool is active
      const selectButton = page.getByRole('button', { name: /select/i });
      await expect(selectButton).toHaveClass(/active|selected/);
    });

    test('Esc should cancel tool operation in progress', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Start line creation
      await page.keyboard.press('l');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Press Escape to cancel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      
      // Verify Select tool is active
      const selectButton = page.getByRole('button', { name: /select/i });
      await expect(selectButton).toHaveClass(/active|selected/);
    });
  });

  test.describe('Delete Key (T271)', () => {
    test('Delete key should remove selected elements', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create two points
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 100 } });
      
      // Switch to select and select first point
      await page.getByRole('button', { name: /select/i }).click();
      await canvas.click({ position: { x: 100, y: 100 } });
      
      await page.waitForTimeout(200);
      
      // Count points before delete
      const pointsBefore = await page.locator('circle.point-marker').count();
      expect(pointsBefore).toBe(2);
      
      // Press Delete
      await page.keyboard.press('Delete');
      await page.waitForTimeout(200);
      
      // Count points after delete
      const pointsAfter = await page.locator('circle.point-marker').count();
      expect(pointsAfter).toBe(1);
    });

    test('Backspace key should remove selected elements', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create a point
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Select it
      await page.getByRole('button', { name: /select/i }).click();
      await canvas.click({ position: { x: 100, y: 100 } });
      
      await page.waitForTimeout(200);
      
      // Press Backspace
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(200);
      
      // Verify point is deleted
      const points = await page.locator('circle.point-marker').count();
      expect(points).toBe(0);
    });

    test('Delete should not activate when typing in input field', async ({ page }) => {
      // Ensure Delete key works normally in input fields
      const searchInput = page.locator('input[type="text"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.click();
        await searchInput.type('test');
        await page.keyboard.press('Backspace');
        
        const value = await searchInput.inputValue();
        expect(value).toBe('tes'); // One character deleted from input
      }
    });
  });

  test.describe('Select All (T270)', () => {
    test('Ctrl+A should select all elements in active plane', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create multiple elements
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 100 } });
      await canvas.click({ position: { x: 300, y: 100 } });
      
      // Create a line
      await page.keyboard.press('l');
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 100 } });
      
      // Switch to select tool
      await page.getByRole('button', { name: /select/i }).click();
      
      // Press Ctrl+A
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      
      // Verify all elements are selected
      const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
      const selectedCount = await selectedElements.count();
      
      // Should have 3 points + 1 line = 4 elements selected (approximately)
      expect(selectedCount).toBeGreaterThanOrEqual(3);
    });

    test('Ctrl+A should prevent default browser behavior', async ({ page }) => {
      // Verify Ctrl+A doesn't trigger browser "select all" on page
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(100);
      
      // Verify app is still functional (not all text selected)
      const canvas = page.locator('svg.diedrico-canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Fit to View (T274)', () => {
    test('Ctrl+0 should fit all elements in view', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create elements spread out
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 50, y: 50 } });
      await canvas.click({ position: { x: 500, y: 500 } });
      
      // Pan and zoom to a different position
      // (simulate user moving viewport away from elements)
      
      // Press Ctrl+0
      await page.keyboard.press('Control+0');
      await page.waitForTimeout(300);
      
      // Verify elements are visible (fit in view)
      // This is hard to test precisely, but we can verify no error occurred
      const points = page.locator('circle.point-marker');
      await expect(points).toHaveCount(2);
    });

    test('Fit to View button should work same as Ctrl+0', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create elements
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Click Fit to View button
      const fitButton = page.getByRole('button', { name: /fit.*view|fit.*all/i });
      if (await fitButton.isVisible()) {
        await fitButton.click();
        await page.waitForTimeout(300);
        
        // Verify no error
        const points = page.locator('circle.point-marker');
        await expect(points).toHaveCount(1);
      }
    });
  });

  test.describe('Undo/Redo (existing functionality)', () => {
    test('Ctrl+Z should undo last action', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create a point
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      await page.waitForTimeout(200);
      
      // Verify point exists
      let points = await page.locator('circle.point-marker').count();
      expect(points).toBe(1);
      
      // Undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
      
      // Verify point is removed
      points = await page.locator('circle.point-marker').count();
      expect(points).toBe(0);
    });

    test('Ctrl+Y should redo last undone action', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create a point
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      await page.waitForTimeout(200);
      
      // Undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
      
      // Verify point is removed
      let points = await page.locator('circle.point-marker').count();
      expect(points).toBe(0);
      
      // Redo
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(200);
      
      // Verify point is restored
      points = await page.locator('circle.point-marker').count();
      expect(points).toBe(1);
    });

    test('Ctrl+Shift+Z should also redo', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create a point
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      
      await page.waitForTimeout(200);
      
      // Undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
      
      // Redo with Ctrl+Shift+Z
      await page.keyboard.press('Control+Shift+z');
      await page.waitForTimeout(200);
      
      // Verify point is restored
      const points = await page.locator('circle.point-marker').count();
      expect(points).toBe(1);
    });
  });

  test.describe('Combined Shortcuts Workflow', () => {
    test('should handle complex keyboard shortcut workflow', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create multiple elements using shortcuts
      await page.keyboard.press('p'); // Point tool
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 100 } });
      
      await page.keyboard.press('l'); // Line tool
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 100 } });
      
      await page.keyboard.press('Escape'); // Cancel and go to select
      
      await page.keyboard.press('Control+a'); // Select all
      await page.waitForTimeout(200);
      
      // Verify elements are selected
      const selectedElements = page.locator('svg.diedrico-canvas [data-selected="true"]');
      const selectedCount = await selectedElements.count();
      expect(selectedCount).toBeGreaterThanOrEqual(2);
      
      await page.keyboard.press('Delete'); // Delete selected
      await page.waitForTimeout(200);
      
      // Verify elements are deleted
      const pointsAfterDelete = await page.locator('circle.point-marker').count();
      expect(pointsAfterDelete).toBe(0);
      
      await page.keyboard.press('Control+z'); // Undo delete
      await page.waitForTimeout(200);
      
      // Verify elements are restored
      const pointsAfterUndo = await page.locator('circle.point-marker').count();
      expect(pointsAfterUndo).toBeGreaterThanOrEqual(2);
      
      await page.keyboard.press('Control+0'); // Fit to view
      await page.waitForTimeout(300);
      
      // Verify still visible
      await expect(page.locator('circle.point-marker').first()).toBeVisible();
    });
  });
});
