import { test, expect } from '@playwright/test';

test.describe('Active Plane Shortcuts (Phase 89)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('svg.diedrico-canvas');
  });

  test('should cycle active plane with Tab and Shift+Tab', async ({ page }) => {
    // Locate the plane selector dropdown
    const planeSelect = page.locator('.plane-select');
    
    // Ensure we start with a known state
    // By default, World initializes with plane_H and plane_V
    // plane_H is usually the first one? Or active one?
    // Let's check what is selected initially.
    // InitializationOps usually sets plane_H as active or first created is active?
    
    // Check initial value
    const initialValue = await planeSelect.inputValue();
    expect(initialValue).toBeTruthy();
    
    // Press Tab to cycle forward
    await page.keyboard.press('Tab');
    
    // Value should change
    const secondValue = await planeSelect.inputValue();
    expect(secondValue).not.toBe(initialValue);
    
    // Press Shift+Tab to cycle backward
    await page.keyboard.press('Shift+Tab');
    
    // Should be back to initial
    await expect(planeSelect).toHaveValue(initialValue);
    
    // Press Shift+Tab again (cycle backward from initial)
    await page.keyboard.press('Shift+Tab');
    expect(await planeSelect.inputValue()).toBe(secondValue);
  });
});
