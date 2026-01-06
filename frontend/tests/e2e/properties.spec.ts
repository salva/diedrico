/**
 * E2E tests for Properties Dialog
 * 
 * Tests the full workflow of property editing:
 * - Creating elements
 * - Opening properties dialog (double-click)
 * - Editing properties
 * - Saving changes
 * - Verifying changes in viewport
 */

import { test, expect } from '@playwright/test';

test.describe('Properties Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for canvas to be ready
    await page.waitForSelector('.svg-canvas');
  });

  test('should open properties dialog on double-click', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Wait for point to be created
    await page.waitForTimeout(100);
    
    // Double-click the point to open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Properties dialog should be visible
    await expect(page.locator('.properties-dialog')).toBeVisible();
    await expect(page.locator('h2:has-text("Properties:")')).toBeVisible();
  });

  test('should display geometry info for point element', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 300, y: 300 } });
    
    // Should show element type
    await expect(page.locator('text=Type:')).toBeVisible();
    await expect(page.locator('text=2D Point')).toBeVisible();
    
    // Should show plane ID
    await expect(page.locator('text=Plane:')).toBeVisible();
    await expect(page.locator('text=proj_plane_H')).toBeVisible();
  });

  test('should allow editing color property', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 400 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 400, y: 400 } });
    
    // Enable color override
    const colorOverride = page.locator('.override-checkbox').first();
    await colorOverride.locator('input[type="checkbox"]').check();
    
    // Change color
    const hexInput = page.locator('.hex-input');
    await hexInput.fill('#FF5733');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Dialog should close
    await expect(page.locator('.properties-dialog')).not.toBeVisible();
  });

  test('should validate invalid hex color', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 100, y: 100 } });
    
    // Enable color override
    const colorOverride = page.locator('.override-checkbox').first();
    await colorOverride.locator('input[type="checkbox"]').check();
    
    // Enter invalid color
    const hexInput = page.locator('.hex-input');
    await hexInput.fill('invalid');
    await hexInput.blur();
    
    // Should show error message
    await expect(page.locator('text=Invalid hex color format')).toBeVisible();
    
    // Save should not close dialog (validation failed)
    await page.click('button:has-text("Save")');
    await expect(page.locator('.properties-dialog')).toBeVisible();
  });

  test('should validate line width range', async ({ page }) => {
    // Create two points
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(100);
    await page.click('.svg-canvas', { position: { x: 300, y: 100 } });
    await page.waitForTimeout(100);
    
    // Create a line between them
    await page.click('button:has-text("Line")');
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 300, y: 100 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog for the line
    await page.dblclick('.svg-canvas', { position: { x: 200, y: 100 } });
    
    // Enable line width override
    const lineWidthOverride = page.locator('.override-checkbox').nth(1);
    await lineWidthOverride.locator('input[type="checkbox"]').check();
    
    // Enter invalid width (too large)
    const numberInput = page.locator('.number-input');
    await numberInput.fill('10');
    await numberInput.blur();
    
    // Should show error message
    await expect(page.locator('text=Line width must be between 0.5 and 5.0')).toBeVisible();
  });

  test('should reset properties to default', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 250, y: 250 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 250, y: 250 } });
    
    // Enable color override and change color
    const colorOverride = page.locator('.override-checkbox').first();
    await colorOverride.locator('input[type="checkbox"]').check();
    const hexInput = page.locator('.hex-input');
    await hexInput.fill('#FF5733');
    
    // Click reset button
    await page.click('button:has-text("Reset to Default")');
    
    // Override should be unchecked
    const checkbox = colorOverride.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();
    
    // Color should be back to default
    await expect(hexInput).toHaveValue('#000000');
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 350, y: 350 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 350, y: 350 } });
    await expect(page.locator('.properties-dialog')).toBeVisible();
    
    // Make some changes
    const colorOverride = page.locator('.override-checkbox').first();
    await colorOverride.locator('input[type="checkbox"]').check();
    const hexInput = page.locator('.hex-input');
    await hexInput.fill('#00FF00');
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Dialog should close
    await expect(page.locator('.properties-dialog')).not.toBeVisible();
  });

  test('should close dialog on overlay click', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 150, y: 150 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 150, y: 150 } });
    await expect(page.locator('.properties-dialog')).toBeVisible();
    
    // Click overlay (outside dialog)
    await page.click('.dialog-overlay', { position: { x: 50, y: 50 } });
    
    // Dialog should close
    await expect(page.locator('.properties-dialog')).not.toBeVisible();
  });

  test('should show different properties for different element types', async ({ page }) => {
    // Create a point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 100, y: 200 } });
    await page.waitForTimeout(100);
    
    // Open properties for point
    await page.dblclick('.svg-canvas', { position: { x: 100, y: 200 } });
    
    // Point should not show line width
    await expect(page.locator('text=Line Width:')).not.toBeVisible();
    
    // Close dialog
    await page.click('button:has-text("Cancel")');
    
    // Create a circle
    await page.click('button:has-text("Circle")');
    const canvas = page.locator('.svg-canvas');
    // Click center
    await canvas.click({ position: { x: 100, y: 200 } });
    // Click radius point
    await canvas.click({ position: { x: 150, y: 200 } });
    await page.waitForTimeout(100);
    
    // Open properties for circle
    await page.dblclick('.svg-canvas', { position: { x: 125, y: 200 } });
    
    // Circle should show line width
    await expect(page.locator('text=Line Width:')).toBeVisible();
  });

  test('should allow multiple override properties', async ({ page }) => {
    // Create two points for a line
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 100, y: 300 } });
    await page.waitForTimeout(100);
    await page.click('.svg-canvas', { position: { x: 300, y: 300 } });
    await page.waitForTimeout(100);
    
    // Create a line
    await page.click('button:has-text("Line")');
    const canvas = page.locator('.svg-canvas');
    await canvas.click({ position: { x: 100, y: 300 } });
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(100);
    
    // Open properties dialog
    await page.dblclick('.svg-canvas', { position: { x: 200, y: 300 } });
    
    // Override color
    const colorOverride = page.locator('.override-checkbox').first();
    await colorOverride.locator('input[type="checkbox"]').check();
    await page.locator('.hex-input').fill('#0000FF');
    
    // Override line width
    const lineWidthOverride = page.locator('.override-checkbox').nth(1);
    await lineWidthOverride.locator('input[type="checkbox"]').check();
    await page.locator('.number-input').fill('3.5');
    
    // Override line style
    const lineStyleOverride = page.locator('.override-checkbox').nth(2);
    await lineStyleOverride.locator('input[type="checkbox"]').check();
    await page.locator('#style-input').selectOption('dashed');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Dialog should close
    await expect(page.locator('.properties-dialog')).not.toBeVisible();
  });
});
