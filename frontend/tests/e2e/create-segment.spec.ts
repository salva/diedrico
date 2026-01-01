/**
 * E2E tests for segment creation workflow
 * 
 * Tests the complete user journey:
 * 1. Select segment tool
 * 2. Click first point
 * 3. Click second point
 * 4. Verify segment rendered
 * 5. Test undo/redo
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2 - Segments
 */

import { test, expect } from '@playwright/test';

test.describe('Segment Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.svg-canvas', { timeout: 5000 });
  });

  test('should create segment between two points', async ({ page }) => {
    // 1. Create first point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Verify point created
    const points1 = await page.locator('circle[data-element-type="point"]').count();
    expect(points1).toBeGreaterThanOrEqual(1);
    
    // 2. Create second point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify second point created
    const points2 = await page.locator('circle[data-element-type="point"]').count();
    expect(points2).toBeGreaterThanOrEqual(2);
    
    // 3. Create segment between points
    await page.click('button:has-text("Segment")');
    
    // Click first point
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Click second point
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // 4. Verify segment rendered
    const segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBeGreaterThanOrEqual(1);
    
    // Verify segment attributes
    const segmentElement = page.locator('line[data-element-type="segment"]').first();
    const x1 = await segmentElement.getAttribute('x1');
    const y1 = await segmentElement.getAttribute('y1');
    const x2 = await segmentElement.getAttribute('x2');
    const y2 = await segmentElement.getAttribute('y2');
    
    // Segment endpoints should be non-zero and different
    expect(parseFloat(x1!)).not.toBe(0);
    expect(parseFloat(y1!)).not.toBe(0);
    expect(parseFloat(x2!)).not.toBe(parseFloat(x1!));
    expect(parseFloat(y2!)).not.toBe(parseFloat(y1!));
  });

  test('should undo segment creation', async ({ page }) => {
    // Create two points
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Create segment
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify segment exists
    let segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBeGreaterThanOrEqual(1);
    
    // Undo segment creation
    await page.click('button[title*="Undo"]');
    
    // Verify segment removed
    segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBe(0);
  });

  test('should redo segment creation', async ({ page }) => {
    // Create two points
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Create segment
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Undo
    await page.click('button[title*="Undo"]');
    
    // Verify segment removed
    let segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBe(0);
    
    // Redo
    await page.click('button[title*="Redo"]');
    
    // Verify segment restored
    segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBeGreaterThanOrEqual(1);
  });

  test('should use keyboard shortcut for undo', async ({ page }) => {
    // Create two points and segment
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Undo with keyboard (Ctrl+Z on Linux/Windows, Cmd+Z on Mac)
    await page.keyboard.press('Control+z');
    
    // Verify segment removed
    const segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBe(0);
  });

  test('should create multiple segments', async ({ page }) => {
    // Create three points
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 300, y: 350 } });
    
    // Create first segment
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    
    // Create second segment
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 300, y: 350 } });
    
    // Create third segment (closes triangle)
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 300, y: 350 } });
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Verify three segments rendered
    const segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBe(3);
  });

  test('should create segments on different planes', async ({ page }) => {
    // Create two points on horizontal plane
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    
    // Create segment on horizontal plane
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 200 } });
    
    // Switch to vertical plane
    await page.click('button:has-text("Vertical")');
    
    // Create two points on vertical plane
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 600 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 600 } });
    
    // Create segment on vertical plane
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 600 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 600 } });
    
    // Verify two segments rendered
    const segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBe(2);
  });

  test('should reject segment with same point twice', async ({ page }) => {
    // Create one point
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Try to create segment by clicking same point twice
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    // Verify no segment created
    const segments = await page.locator('line[data-element-type="segment"]').count();
    expect(segments).toBe(0);
  });

  test('should display segment with distinct visual style', async ({ page }) => {
    // Create two points
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    
    await page.click('button:has-text("Point")');
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Create segment
    await page.click('button:has-text("Segment")');
    await page.click('.svg-canvas', { position: { x: 200, y: 200 } });
    await page.click('.svg-canvas', { position: { x: 400, y: 300 } });
    
    // Verify segment has thicker stroke than lines
    const segmentElement = page.locator('line[data-element-type="segment"]').first();
    const strokeWidth = await segmentElement.getAttribute('stroke-width');
    
    // Segments should have stroke-width of 2 (thicker than lines)
    expect(parseFloat(strokeWidth!)).toBeGreaterThanOrEqual(2);
  });
});
