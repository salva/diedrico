import { test, expect } from '@playwright/test';

test.describe('Dynamic Projection Planes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000); // Wait for initialization
  });

  test('should display new projection planes in the Elements Panel', async ({ page }) => {
    // 1. Verify initial state (P_H and P_V exist)
    const elementsPanel = page.locator('.panel-content');
    
    // Check for P_H (using regex for text match)
    await expect(elementsPanel.locator('.plane-name', { hasText: /P\s*H.*Horizontal/ })).toBeVisible({ timeout: 10000 });
    
    // Check for P_V
    await expect(elementsPanel.locator('.plane-name', { hasText: /P\s*V.*Vertical/ })).toBeVisible();

    // 2. Add a new plane via console injection
    await page.evaluate(async () => {
      const THREE = (window as any).THREE;
      if (!THREE) throw new Error('THREE not exposed on window');
      
      const worldStoreModule = await (window as any).getWorld();
      const world = worldStoreModule.world;
      const worldStore = worldStoreModule.useWorldStore ? worldStoreModule.useWorldStore() : undefined;

      // Get P_H matrices to clone (P_H usually exists)
      const ph = world.getProjectionPlaneById('proj_plane_H');
      if (!ph) throw new Error('P_H not found');
      
      const m1 = ph.getPlaneToPaperMatrix();
      const m2 = ph.getPlaneTo3DMatrix();
      const m3 = ph.get3DToPlaneMatrix();

      // Create new plane
      const newPlane = world.addProjectionPlane(
        'plane3d_new',
        m1, m2, m3, // Reuse matrices
        'proj_plane_New', // ID
        'P_New' // Name
      );
      
      // Elements Panel only shows planes with elements.
      // Add a point to the new plane.
      newPlane.addFreePoint2D(
        new THREE.Vector3(100, 100, 0),
        world,
        'point_new_1',
        'Point 1'
      );
      
      console.log('Added P_New and point_new_1');

      // Force reactivity update
      if (worldStore) {
        world.notifyChange();
      }
    });

    // 3. Verify the new plane appears
    // The name should be "P_New (Auxiliary)" based on the logic I saw in ElementsPanel 
    // (label: plane.name === 'P_H' ? 'Horizontal' : ... 'Auxiliary')
    // Wait, let's verify line 214 in ElementsPanel.vue again:
    // label: ... : 'Auxiliary'),
    
    // So text should be "P_New (Auxiliary)"
    await expect(elementsPanel.locator('.plane-name', { hasText: 'P_New (Auxiliary)' })).toBeVisible({ timeout: 5000 });
    
    // 4. Verify the element inside it is visible (default is expanded)
    await expect(elementsPanel.locator('.element-item', { hasText: 'Point 1' })).toBeVisible();
    
    // 5. Test toggling collapse
    // Click header to collapse
    await elementsPanel.locator('.plane-group', { hasText: 'P_New' }).locator('.plane-header').click();
    
    // Point should be hidden (not present in DOM due to v-if="!isCollapsed")
    await expect(elementsPanel.locator('.element-item', { hasText: 'Point 1' })).toBeHidden();
    
    // Click header to expand
    await elementsPanel.locator('.plane-group', { hasText: 'P_New' }).locator('.plane-header').click();
    
    // Point should be visible again
    await expect(elementsPanel.locator('.element-item', { hasText: 'Point 1' })).toBeVisible();
  });
});
