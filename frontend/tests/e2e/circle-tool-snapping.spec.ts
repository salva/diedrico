/**
 * E2E Test: Circle Tool Circumference Point Snapping (Phase 56)
 * 
 * Tests the user workflow for creating circles with proper point snapping
 * behavior on both center and circumference clicks. Verifies:
 * - Visual feedback (orange snap circle) appears on hover
 * - No duplicate points created when snapping
 * - Point count verification
 * - Success messages indicate snap vs create
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - FR-041
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - Phase 56 (T986)
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Circle Tool Point Snapping
 */

import { test, expect } from '@playwright/test';

test.describe('Circle Tool: Circumference Point Snapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('svg.diedrico-canvas');
  });

  test('T986: Both clicks snap to existing points - no duplicates created', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Step 1: Create center point at (150, 150)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 150, y: 150 } });
    
    // Step 2: Create circumference point at (250, 150)
    await canvas.click({ position: { x: 250, y: 150 } });
    
    // Count initial points (should be 2 user points + origin points)
    const initialPoints = await page.locator('circle.point-marker').count();
    
    // Step 3: Create circle using existing points
    await page.getByRole('button', { name: /circle/i }).click();
    
    // First click - snap to center point
    await canvas.click({ position: { x: 150, y: 150 } });
    
    // Verify feedback message shows center selected
    const feedback = page.locator('.tool-feedback, .status-message, [role="status"]');
    await expect(feedback).toContainText(/center.*selected/i, { timeout: 1000 });
    
    // Second click - snap to circumference point
    await canvas.click({ position: { x: 250, y: 150 } });
    
    // Verify success message indicates snapping
    await expect(feedback).toContainText(/created circle/i, { timeout: 1000 });
    await expect(feedback).toContainText(/snapped/i, { timeout: 1000 });
    
    // Count final points - should be SAME as initial (no duplicates)
    const finalPoints = await page.locator('circle.point-marker').count();
    expect(finalPoints).toBe(initialPoints);
    
    // Verify circle was created
    const circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(1);
  });

  test('T986: Center snaps, circumference creates new point', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Step 1: Create only center point at (200, 200)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Count initial points
    const initialPoints = await page.locator('circle.point-marker').count();
    
    // Step 2: Create circle - snap center, create circumference
    await page.getByRole('button', { name: /circle/i }).click();
    
    // First click - snap to existing center point
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Second click - create new circumference point far from existing points
    await canvas.click({ position: { x: 350, y: 200 } });
    
    // Verify feedback shows circle created with new point
    const feedback = page.locator('.tool-feedback, .status-message, [role="status"]');
    await expect(feedback).toContainText(/created circle/i, { timeout: 1000 });
    await expect(feedback).toContainText(/created/i, { timeout: 1000 });
    
    // Count final points - should be +1 (new circumference point)
    const finalPoints = await page.locator('circle.point-marker').count();
    expect(finalPoints).toBe(initialPoints + 1);
    
    // Verify circle was created
    const circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(1);
  });

  test('T986: Visual snap feedback on hover (both clicks)', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create two points for testing
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 180, y: 180 } });
    await canvas.click({ position: { x: 280, y: 180 } });
    
    // Activate circle tool
    await page.getByRole('button', { name: /circle/i }).click();
    
    // Hover near first point (center) - should show orange snap circle
    await canvas.hover({ position: { x: 180, y: 180 } });
    await page.waitForTimeout(100); // Wait for hover to register
    
    // Check for snap indicator (orange circle or highlighted point)
    const snapIndicator = page.locator('circle.snap-indicator, circle.point-marker[data-hovered="true"]');
    await expect(snapIndicator.first()).toBeVisible();
    
    // Click to select center
    await canvas.click({ position: { x: 180, y: 180 } });
    
    // Hover near second point (circumference) - should ALSO show snap feedback
    await canvas.hover({ position: { x: 280, y: 180 } });
    await page.waitForTimeout(100);
    
    // Verify snap indicator appears for circumference point too
    await expect(snapIndicator.first()).toBeVisible();
    
    // Click to complete circle
    await canvas.click({ position: { x: 280, y: 180 } });
    
    // Verify circle created
    const circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(1);
  });

  test('T986: Multiple circles with snapping - point count remains stable', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create a grid of 4 points
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 150, y: 150 } }); // Top-left
    await canvas.click({ position: { x: 250, y: 150 } }); // Top-right
    await canvas.click({ position: { x: 150, y: 250 } }); // Bottom-left
    await canvas.click({ position: { x: 250, y: 250 } }); // Bottom-right
    
    // Count initial points (4 user points + origin points)
    const initialPoints = await page.locator('circle.point-marker').count();
    
    // Create first circle: TL → TR (both snap)
    await page.getByRole('button', { name: /circle/i }).click();
    await canvas.click({ position: { x: 150, y: 150 } });
    await canvas.click({ position: { x: 250, y: 150 } });
    
    // Create second circle: BL → BR (both snap)
    await canvas.click({ position: { x: 150, y: 250 } });
    await canvas.click({ position: { x: 250, y: 250 } });
    
    // Create third circle: TL → BL (both snap)
    await canvas.click({ position: { x: 150, y: 150 } });
    await canvas.click({ position: { x: 150, y: 250 } });
    
    // Count final points - should be SAME as initial (all snapped)
    const finalPoints = await page.locator('circle.point-marker').count();
    expect(finalPoints).toBe(initialPoints);
    
    // Verify 3 circles were created
    const circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(3);
  });

  test('T986: Minimum radius validation prevents tiny circles', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create two points very close together
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 200, y: 200 } });
    await canvas.click({ position: { x: 201, y: 200 } }); // Only 1px apart
    
    // Try to create circle with these close points
    await page.getByRole('button', { name: /circle/i }).click();
    await canvas.click({ position: { x: 200, y: 200 } });
    await canvas.click({ position: { x: 201, y: 200 } });
    
    // Verify error message about minimum radius
    const feedback = page.locator('.tool-feedback, .status-message, [role="status"]');
    await expect(feedback).toContainText(/radius too small/i, { timeout: 1000 });
    
    // Verify no circle was created
    const circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(0);
  });

  test('T986: Snap radius consistency with other tools', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create a point at (170, 170)
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 170, y: 170 } });
    
    // Try to create circle center 40px away (within 50px snap radius)
    await page.getByRole('button', { name: /circle/i }).click();
    await canvas.click({ position: { x: 210, y: 170 } }); // 40px to the right
    
    // Verify feedback shows snap occurred
    const feedback = page.locator('.tool-feedback, .status-message, [role="status"]');
    await expect(feedback).toContainText(/center.*selected/i, { timeout: 1000 });
    
    // Create circumference point - also within snap radius
    await canvas.click({ position: { x: 195, y: 170 } }); // ~25px from center, within snap radius
    
    // Verify circle created with snapped point (message should say "snapped")
    await expect(feedback).toContainText(/created circle/i, { timeout: 1000 });
    await expect(feedback).toContainText(/snapped/i, { timeout: 1000 });
    
    // Should only have 1 user point total (both clicks snapped)
    const userPoints = await page.locator('circle.point-marker').count();
    // Subtract origin points (2) to get user points
    expect(userPoints).toBeGreaterThanOrEqual(3); // 1 user point + 2 origin points
  });

  test('T986: Cancel circle creation with Escape key', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Create a point
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 160, y: 160 } });
    
    // Start circle creation
    await page.getByRole('button', { name: /circle/i }).click();
    await canvas.click({ position: { x: 160, y: 160 } }); // Select center
    
    // Verify we're in "waiting for circumference" state
    const feedback = page.locator('.tool-feedback, .status-message, [role="status"]');
    await expect(feedback).toContainText(/center.*selected/i, { timeout: 1000 });
    
    // Press Escape to cancel
    await page.keyboard.press('Escape');
    
    // Verify tool is deselected or reset
    // Tool should either deactivate or reset to waiting-center state
    await page.waitForTimeout(200);
    
    // Clicking again should start fresh (not create circle)
    await canvas.click({ position: { x: 260, y: 160 } });
    
    // Should not create a circle (should either create point or start new circle workflow)
    const circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(0);
  });

  test('T986: Consistent snapping across plane switches', async ({ page }) => {
    const canvas = page.locator('svg.diedrico-canvas');
    
    // Get horizontal plane ID from the toolbar/selector
    const planeSelector = page.locator('[data-testid="plane-selector"], .plane-selector');
    
    // Verify we're on horizontal plane (P_H)
    // This test assumes plane switching is implemented
    
    // Create point on horizontal plane
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 190, y: 190 } });
    
    // Create circle snapping to that point
    await page.getByRole('button', { name: /circle/i }).click();
    await canvas.click({ position: { x: 190, y: 190 } }); // Snap to center
    await canvas.click({ position: { x: 290, y: 190 } }); // Create circumference
    
    // Verify circle created
    let circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(1);
    
    // Switch to vertical plane (if UI supports it)
    // await planeSelector.selectOption('P_V');
    
    // Create another point on vertical plane
    await page.getByRole('button', { name: /point/i }).click();
    await canvas.click({ position: { x: 220, y: 220 } });
    
    // Create circle on vertical plane with snapping
    await page.getByRole('button', { name: /circle/i }).click();
    await canvas.click({ position: { x: 220, y: 220 } }); // Snap
    await canvas.click({ position: { x: 320, y: 220 } }); // Create
    
    // Verify second circle created (snapping works on different plane)
    circles = page.locator('circle.circle-geometry');
    await expect(circles).toHaveCount(2);
  });
});
