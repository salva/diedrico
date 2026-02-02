/**
 * E2E Test: Undo/Redo Functionality
 * 
 * Verifies that undo/redo works correctly for construction actions:
 * - Undo button disabled when no history
 * - Undo removes elements
 * - Redo button enabled after undo
 * - Redo restores elements
 * - Keyboard shortcuts work (Ctrl+Z, Ctrl+Y)
 * - New action clears redo stack
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T074
 */

import { test, expect } from '@playwright/test';

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('svg.diedrico-canvas');
  });

  test('undo button should be disabled initially', async ({ page }) => {
    const undoButton = page.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeDisabled();
  });

  test('redo button should be disabled initially', async ({ page }) => {
    const redoButton = page.getByRole('button', { name: /redo/i });
    await expect(redoButton).toBeDisabled();
  });

  test('should enable undo after creating a point', async ({ page }) => {
    // Select point tool
    await page.getByRole('button', { name: /point/i }).click();
    
    // Click on canvas to create point
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Wait for point to appear
    await page.waitForSelector('circle.point-marker');
    
    // Undo button should be enabled
    const undoButton = page.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeEnabled();
  });

  test('should undo point creation via button', async ({ page }) => {
    // Create a point
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    
    // Verify point exists
    const pointsBefore = await page.locator('circle.point-marker').count();
    expect(pointsBefore).toBeGreaterThan(0);
    
    // Click undo button
    await page.getByRole('button', { name: /undo/i }).click();
    
    // Point should be removed
    await page.waitForTimeout(100); // Brief wait for DOM update
    const pointsAfter = await page.locator('circle.point-marker').count();
    expect(pointsAfter).toBe(pointsBefore - 1);
  });

  test('should undo point creation via keyboard (Ctrl+Z)', async ({ page }) => {
    // Create a point
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    
    const pointsBefore = await page.locator('circle.point-marker').count();
    
    // Press Ctrl+Z
    await page.keyboard.press('Control+z');
    
    // Point should be removed
    await page.waitForTimeout(100);
    const pointsAfter = await page.locator('circle.point-marker').count();
    expect(pointsAfter).toBe(pointsBefore - 1);
  });

  test('should enable redo after undo', async ({ page }) => {
    // Create and undo a point
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    
    await page.getByRole('button', { name: /undo/i }).click();
    await page.waitForTimeout(100);
    
    // Redo button should be enabled
    const redoButton = page.getByRole('button', { name: /redo/i });
    await expect(redoButton).toBeEnabled();
  });

  test('should redo point creation via button', async ({ page }) => {
    // Create, undo, then redo a point
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    
    const pointsInitial = await page.locator('circle.point-marker').count();
    
    // Undo
    await page.getByRole('button', { name: /undo/i }).click();
    await page.waitForTimeout(100);
    const pointsAfterUndo = await page.locator('circle.point-marker').count();
    expect(pointsAfterUndo).toBe(pointsInitial - 1);
    
    // Redo
    await page.getByRole('button', { name: /redo/i }).click();
    await page.waitForTimeout(100);
    const pointsAfterRedo = await page.locator('circle.point-marker').count();
    expect(pointsAfterRedo).toBe(pointsInitial);
  });

  test('should redo point creation via keyboard (Ctrl+Y)', async ({ page }) => {
    // Create, undo, then redo with Ctrl+Y
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    
    const pointsInitial = await page.locator('circle.point-marker').count();
    
    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    
    // Redo
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(100);
    const pointsAfterRedo = await page.locator('circle.point-marker').count();
    expect(pointsAfterRedo).toBe(pointsInitial);
  });

  test('should clear redo stack on new action', async ({ page }) => {
    // Create two points
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    await canvas.click({ position: { x: 500, y: 350 } });
    await page.waitForTimeout(100);
    
    // Undo one
    await page.getByRole('button', { name: /undo/i }).click();
    await page.waitForTimeout(100);
    
    // Redo button should be enabled
    const redoButton = page.getByRole('button', { name: /redo/i });
    await expect(redoButton).toBeEnabled();
    
    // Create a new point
    await canvas.click({ position: { x: 600, y: 400 } });
    await page.waitForTimeout(100);
    
    // Redo button should be disabled (redo stack cleared)
    await expect(redoButton).toBeDisabled();
  });

  test('should undo/redo multiple actions in correct order', async ({ page }) => {
    // Create three points
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    await canvas.click({ position: { x: 500, y: 350 } });
    await page.waitForTimeout(50);
    await canvas.click({ position: { x: 600, y: 400 } });
    await page.waitForTimeout(100);
    
    const initialCount = await page.locator('circle.point-marker').count();
    
    // Undo all three
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    
    const afterUndoAll = await page.locator('circle.point-marker').count();
    expect(afterUndoAll).toBe(initialCount - 3);
    
    // Redo all three
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(100);
    
    const afterRedoAll = await page.locator('circle.point-marker').count();
    expect(afterRedoAll).toBe(initialCount);
  });

  test('should undo/redo line creation', async ({ page }) => {
    // Create two points
    await page.getByRole('button', { name: /point/i }).click();
    const canvas = page.locator('svg.diedrico-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForSelector('circle.point-marker');
    await canvas.click({ position: { x: 500, y: 350 } });
    await page.waitForTimeout(100);
    
    // Create a line
    await page.getByRole('button', { name: /line/i }).click();
    const points = page.locator('circle.point-marker');
    await points.first().click();
    await points.nth(1).click();
    await page.waitForSelector('line.line-element');
    
    const lineCount = await page.locator('line.line-element').count();
    expect(lineCount).toBeGreaterThan(0);
    
    // Undo line creation
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    
    const linesAfterUndo = await page.locator('line.line-element').count();
    expect(linesAfterUndo).toBe(lineCount - 1);
    
    // Redo line creation
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(100);
    
    const linesAfterRedo = await page.locator('line.line-element').count();
    expect(linesAfterRedo).toBe(lineCount);
  });
});
