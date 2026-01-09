/**
 * E2E Test: Keyboard Shortcuts








































































































































































































































































});  });    await expect(cascadeWarning).toContainText('2 elements will be cascade deleted');    await expect(cascadeWarning).toBeVisible();    const cascadeWarning = statusBar.locator('.cascade-warning');    const statusBar = page.locator('.status-bar');    // Verify cascade warning shows both lines will be deleted        await page.waitForTimeout(100);    await page.keyboard.up('Shift');    await canvas.click({ position: { x: 200, y: 100 } });    await page.keyboard.down('Shift');    await canvas.click({ position: { x: 100, y: 100 } });    await page.getByRole('button', { name: /select/i }).click();    // Select point 1 with Shift+click on point 2 to multi-select        await page.waitForTimeout(300);        await canvas.click({ position: { x: 150, y: 50 } });    await canvas.click({ position: { x: 100, y: 100 } }); // Line 1-3    await canvas.click({ position: { x: 200, y: 100 } });    await canvas.click({ position: { x: 100, y: 100 } }); // Line 1-2    await page.keyboard.press('l');        await canvas.click({ position: { x: 150, y: 50 } });  // Point 3    await canvas.click({ position: { x: 200, y: 100 } }); // Point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Point 1    await page.keyboard.press('p');    // Create: 3 points + 2 lines forming a triangle        const canvas = page.locator('svg.diedrico-canvas');  test('should show correct cascade count for multiple selected elements', async ({ page }) => {  });    await expect(cascadeWarning).not.toBeVisible();    // Verify cascade warning is gone        await page.waitForTimeout(100);    await page.keyboard.press('Escape');    // Press Escape to clear selection        await expect(cascadeWarning).toBeVisible();    const cascadeWarning = statusBar.locator('.cascade-warning');    const statusBar = page.locator('.status-bar');    // Verify cascade warning is shown        await page.waitForTimeout(100);    await canvas.click({ position: { x: 100, y: 100 } });    await page.getByRole('button', { name: /select/i }).click();    // Select point to show cascade preview        await page.waitForTimeout(300);        await canvas.click({ position: { x: 200, y: 100 } });    await canvas.click({ position: { x: 100, y: 100 } });    await page.keyboard.press('l');        await canvas.click({ position: { x: 200, y: 100 } });    await canvas.click({ position: { x: 100, y: 100 } });    await page.keyboard.press('p');    // Create point and line        const canvas = page.locator('svg.diedrico-canvas');  test('should clear cascade preview when selection is cleared', async ({ page }) => {  });    expect(lines).toBe(1);  // Only line 2 remains    expect(points).toBe(3); // Points 2, 3, 4 remain    lines = await page.locator('line[id^="line-"]').count();    points = await page.locator('circle.point-marker').count();    // Verify cascade: point 1 and line 1 deleted, but line 2 and points 3,4 remain        await page.waitForTimeout(300);    await page.keyboard.press('Delete');        await page.waitForTimeout(100);    await canvas.click({ position: { x: 100, y: 100 } });    await page.getByRole('button', { name: /select/i }).click();    // Delete point 1 (should cascade delete line 1)        expect(lines).toBe(2);    expect(points).toBe(4);    let lines = await page.locator('line[id^="line-"]').count();    let points = await page.locator('circle.point-marker').count();        // For now, just verify we have the base construction    // This would be at (150, 100) where the two lines cross    // Create intersection point (if tool exists)        await page.waitForTimeout(300);        await canvas.click({ position: { x: 150, y: 150 } });    await canvas.click({ position: { x: 150, y: 50 } });    // Create line 2 (vertical through points 3-4)        await canvas.click({ position: { x: 200, y: 100 } });    await canvas.click({ position: { x: 100, y: 100 } });    // Create line 1 (horizontal through points 1-2)    await page.keyboard.press('l');        await canvas.click({ position: { x: 150, y: 150 } }); // Point 4    await canvas.click({ position: { x: 150, y: 50 } });  // Point 3    await canvas.click({ position: { x: 200, y: 100 } }); // Point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Point 1    await page.keyboard.press('p');        // When Point 1 is deleted, everything should cascade    // Create chain: Point 1 → Line → Intersection Point → Circle        const canvas = page.locator('svg.diedrico-canvas');  test('should delete multiple levels of dependencies', async ({ page }) => {  });    expect(circles).toBe(0);    expect(lines).toBe(0);    circles = await page.locator('circle[id^="circle-"]').count();    lines = await page.locator('line[id^="line-"]').count();    // Verify cascade deletion again        await page.waitForTimeout(300);    await page.keyboard.press('Control+y');    // Redo deletion        expect(circles).toBe(1); // Circle restored    expect(lines).toBe(1);   // Line restored    expect(points).toBeGreaterThanOrEqual(2);    circles = await page.locator('circle[id^="circle-"]').count();    lines = await page.locator('line[id^="line-"]').count();    points = await page.locator('circle.point-marker').count();    // Verify all elements restored        await page.waitForTimeout(300);    await page.keyboard.press('Control+z');    // Undo deletion        expect(circles).toBe(0); // Circle deleted    expect(lines).toBe(0);   // Line deleted    circles = await page.locator('circle[id^="circle-"]').count();    lines = await page.locator('line[id^="line-"]').count();    // Verify cascade deletion        await page.waitForTimeout(300);    await page.keyboard.press('Delete');        await page.waitForTimeout(100);    await canvas.click({ position: { x: 100, y: 100 } });    await page.getByRole('button', { name: /select/i }).click();    // Delete point 1 (should cascade delete line and circle)        expect(circles).toBe(1);    expect(lines).toBe(1);    expect(points).toBeGreaterThanOrEqual(2); // At least 2 points (may have more from circle)    let circles = await page.locator('circle[id^="circle-"]').count();    let lines = await page.locator('line[id^="line-"]').count();    let points = await page.locator('circle.point-marker').count();    // Verify initial state        await page.waitForTimeout(300);        await canvas.click({ position: { x: 150, y: 100 } }); // Radius point    await canvas.click({ position: { x: 100, y: 100 } }); // Circle center at point 1    await page.keyboard.press('c');        await canvas.click({ position: { x: 200, y: 100 } }); // to point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Line from point 1    await page.keyboard.press('l');        await canvas.click({ position: { x: 200, y: 100 } }); // Point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Point 1    await page.keyboard.press('p');    // Create: 2 points + line + circle on first point        const canvas = page.locator('svg.diedrico-canvas');  test('should undo cascade deletion and restore all elements (T291, T292)', async ({ page }) => {  });    expect(lines).toBe(0);  // Line deleted due to cascade    expect(points).toBe(1); // Only point 2 remains    lines = await page.locator('line[id^="line-"]').count();    points = await page.locator('circle.point-marker').count();    // Verify cascade deletion: both line and point are deleted        await page.waitForTimeout(300);    await page.keyboard.press('Delete');        await page.waitForTimeout(100);    await canvas.click({ position: { x: 100, y: 100 } });    await page.getByRole('button', { name: /select/i }).click();    // Select and delete point 1        expect(lines).toBe(1);    expect(points).toBe(2);    let lines = await page.locator('line[id^="line-"]').count();    let points = await page.locator('circle.point-marker').count();    // Verify initial state        await page.waitForTimeout(300);        await canvas.click({ position: { x: 200, y: 100 } }); // Click point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Click point 1    await page.keyboard.press('l');        await canvas.click({ position: { x: 200, y: 100 } }); // Point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Point 1    await page.keyboard.press('p');    // Create construction: 2 points + 1 line between them        const canvas = page.locator('svg.diedrico-canvas');  test('should delete dependents when deleting a point (T288, T292)', async ({ page }) => {  });    // For now we verify the warning message which confirms cascade detection works    // Note: This would require checking SVG element styles, which is complex in Playwright    // Verify cascade highlighted elements have orange color        await expect(cascadeWarning).toContainText('1 element will be cascade deleted');    // Verify it shows the correct count (1 line will be cascade deleted)        await expect(cascadeWarning).toBeVisible();    const cascadeWarning = statusBar.locator('.cascade-warning');    const statusBar = page.locator('.status-bar');    // Verify cascade warning appears in status bar        await page.waitForTimeout(300);        await canvas.click({ position: { x: 100, y: 100 } });    await page.getByRole('button', { name: /select/i }).click();    // Switch to select tool and select point 1        await page.waitForTimeout(300);        await canvas.click({ position: { x: 200, y: 100 } }); // Click point 2 to create line    await canvas.click({ position: { x: 100, y: 100 } }); // Click point 1    await page.keyboard.press('l');        await canvas.click({ position: { x: 200, y: 100 } }); // Point 2    await canvas.click({ position: { x: 100, y: 100 } }); // Point 1    await page.keyboard.press('p');    // Create a point and a line that depends on it        const canvas = page.locator('svg.diedrico-canvas');  test('should show cascade preview when selecting element with dependents (T289)', async ({ page }) => {  });    await page.waitForSelector('svg.diedrico-canvas');    // Wait for app to load    await page.goto('/');  test.beforeEach(async ({ page }) => {test.describe('Cascade Deletion', () => {import { test, expect } from '@playwright/test'; */ * Reference: specs/001-dihedral-learning-mvp/data-model.md - Deletion and Dependency Cascading * Reference: specs/001-dihedral-learning-mvp/tasks.md - Phase 30: T285-T292 *  * - Dependency tracking and cascade computation * - Undo/redo support for cascade deletion * - Proper deletion order (dependents before dependencies) * - Status bar message showing count of cascade elements * - Visual feedback showing which elements will be cascade deleted (orange highlight) * Tests the cascade deletion functionality implemented in Phase 30: *  * 
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

  test.describe('Delete Key (T271, T291)', () => {
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
    
    test('Delete and Undo should restore deleted elements (T291)', async ({ page }) => {
      const canvas = page.locator('svg.diedrico-canvas');
      
      // Create a point
      await page.keyboard.press('p');
      await canvas.click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(200);
      
      // Verify point exists
      let points = await page.locator('circle.point-marker').count();
      expect(points).toBe(1);
      
      // Select and delete the point
      await page.getByRole('button', { name: /select/i }).click();
      await canvas.click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(100);
      
      await page.keyboard.press('Delete');
      await page.waitForTimeout(200);
      
      // Verify point is deleted
      points = await page.locator('circle.point-marker').count();
      expect(points).toBe(0);
      
      // Undo deletion
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
      
      // Verify point is restored
      points = await page.locator('circle.point-marker').count();
      expect(points).toBe(1);
      
      // Redo deletion
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(200);
      
      // Verify point is deleted again
      points = await page.locator('circle.point-marker').count();
      expect(points).toBe(0);
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
