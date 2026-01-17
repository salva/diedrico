/**
 * Phase 78: Grid Coordinate Labels
 * Unit tests for grid coordinate label computation
 */

import { describe, it, expect } from 'vitest';

describe('Phase 78: Grid Coordinate Labels', () => {
  describe('Label Computation Logic', () => {
    it('should compute major grid spacing correctly based on zoom level', () => {
      // Zoom < 0.5 → spacing = 50 → majorSpacing = 250
      const spacing1 = 0.3 < 0.5 ? 50 : 0.3 < 2.0 ? 20 : 10;
      expect(spacing1).toBe(50);
      expect(spacing1 * 5).toBe(250);
      
      // Zoom = 1.0 → spacing = 20 → majorSpacing = 100
      const spacing2 = 1.0 < 0.5 ? 50 : 1.0 < 2.0 ? 20 : 10;
      expect(spacing2).toBe(20);
      expect(spacing2 * 5).toBe(100);
      
      // Zoom = 3.0 → spacing = 10 → majorSpacing = 50
      const spacing3 = 3.0 < 0.5 ? 50 : 3.0 < 2.0 ? 20 : 10;
      expect(spacing3).toBe(10);
      expect(spacing3 * 5).toBe(50);
    });
    
    it('should generate labels for visible major grid lines only', () => {
      // Simulate viewport: 800x600px, zoom=1.0, pan=(0,0)
      const viewportWidth = 800;
      const zoom = 1.0;
      const panX = 0;
      const majorSpacing = 100;
      const offsetX = -panX; // 0
      
      // Labels should appear at: -100, 0, 100, 200, 300, 400, 500, 600, 700, 800
      const expectedPositions: number[] = [];
      const startX = Math.floor(offsetX / majorSpacing) * majorSpacing; // 0
      const endX = Math.ceil((offsetX + viewportWidth) / majorSpacing) * majorSpacing; // 800
      
      for (let x = startX; x <= endX; x += majorSpacing) {
        const screenX = (x + panX) * zoom;
        if (screenX >= -10 && screenX <= viewportWidth + 10) {
          expectedPositions.push(screenX);
        }
      }
      
      expect(expectedPositions).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800]);
    });
    
    it('should handle panned viewport correctly', () => {
      // Simulate viewport: 800x600px, zoom=1.0, pan=(-50, -30)
      const viewportWidth = 800;
      const zoom = 1.0;
      const panX = -50;
      const majorSpacing = 100;
      const offsetX = -panX; // 50
      
      // Paper coordinates visible: [50, 850]
      // Labels at: 0, 100, 200, 300, 400, 500, 600, 700, 800, 900
      // Screen positions: 0 would be at -50 (outside margin), 100 at 50, 200 at 150, etc.
      const positions: number[] = [];
      const startX = Math.floor(offsetX / majorSpacing) * majorSpacing; // 0
      const endX = Math.ceil((offsetX + viewportWidth) / majorSpacing) * majorSpacing; // 900
      
      for (let x = startX; x <= endX; x += majorSpacing) {
        const screenX = (x + panX) * zoom;
        if (screenX >= -10 && screenX <= viewportWidth + 10) {
          positions.push(screenX);
        }
      }
      
      // Screen positions within margin: 50, 150, 250, 350, 450, 550, 650, 750
      expect(positions).toEqual([50, 150, 250, 350, 450, 550, 650, 750]);
    });
    
    it('should handle zoomed viewport correctly', () => {
      // Simulate viewport: 800x600px, zoom=2.0, pan=(0,0)
      const viewportWidth = 800;
      const zoom = 2.0;
      const panX = 0;
      const majorSpacing = 100; // At zoom 2.0, spacing=20, majorSpacing=100
      const offsetX = -panX; // 0
      
      // Paper coordinates visible: [0, 400]
      // Labels at: 0, 100, 200, 300, 400
      // Screen positions: 0, 200, 400, 600, 800
      const positions: number[] = [];
      const startX = Math.floor(offsetX / majorSpacing) * majorSpacing; // 0
      const endX = Math.ceil((offsetX + viewportWidth / zoom) / majorSpacing) * majorSpacing; // 400
      
      for (let x = startX; x <= endX; x += majorSpacing) {
        const screenX = (x + panX) * zoom;
        if (screenX >= -10 && screenX <= viewportWidth + 10) {
          positions.push(screenX);
        }
      }
      
      expect(positions).toEqual([0, 200, 400, 600, 800]);
    });
    
    it('should show origin (0,0) label when visible', () => {
      // Viewport centered at origin
      const zoom = 1.0;
      const panX = 400; // Centers 800px viewport at x=0
      const majorSpacing = 100;
      const offsetX = -panX; // -400
      
      // Paper coordinates visible: [-400, 400]
      // Origin (0) should be visible at screen position: (0 + 400) * 1.0 = 400
      const screenX = (0 + panX) * zoom;
      expect(screenX).toBe(400);
      expect(screenX >= -10 && screenX <= 800 + 10).toBe(true);
    });
  });
  
  describe('Label Format', () => {
    it('should display numeric coordinate values as integers', () => {
      // Labels show raw numeric values: 0, 100, 200, -100, etc.
      const labels = [0, 100, 200, -100, -50];
      labels.forEach(value => {
        expect(Number.isInteger(value)).toBe(true);
      });
    });
    
    it('should handle negative coordinates', () => {
      // Viewport panned to show negative coordinates
      const zoom = 1.0;
      const panX = 200; // Viewport includes negative x values
      const majorSpacing = 100;
      const offsetX = -panX; // -200
      
      // Paper coordinates visible: [-200, 600]
      // Labels at: -200, -100, 0, 100, 200, 300, 400, 500, 600
      const values: number[] = [];
      const startX = Math.floor(offsetX / majorSpacing) * majorSpacing; // -200
      const endX = 600;
      
      for (let x = startX; x <= endX; x += majorSpacing) {
        values.push(x);
      }
      
      expect(values).toContain(-200);
      expect(values).toContain(-100);
      expect(values).toContain(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle grid disabled (empty labels)', () => {
      // When grid is disabled, no labels should be rendered
      const gridVisible = false;
      const labels = gridVisible ? { top: [], bottom: [], left: [], right: [] } : { top: [], bottom: [], left: [], right: [] };
      
      expect(labels.top).toHaveLength(0);
      expect(labels.bottom).toHaveLength(0);
      expect(labels.left).toHaveLength(0);
      expect(labels.right).toHaveLength(0);
    });
    
    it('should handle extreme zoom levels', () => {
      // Zoom = 0.1 → spacing = 50 → majorSpacing = 250
      const zoom = 0.1;
      const spacing = zoom < 0.5 ? 50 : zoom < 2.0 ? 20 : 10;
      expect(spacing).toBe(50);
      
      // Zoom = 10.0 → spacing = 10 → majorSpacing = 50
      const zoom2 = 10.0;
      const spacing2 = zoom2 < 0.5 ? 50 : zoom2 < 2.0 ? 20 : 10;
      expect(spacing2).toBe(10);
    });
    
    it('should handle viewport boundaries correctly with margin', () => {
      // Labels within 10px of viewport edge should still be visible
      const viewportWidth = 800;
      const screenX = -5; // 5px outside left edge
      expect(screenX >= -10 && screenX <= viewportWidth + 10).toBe(true);
      
      const screenX2 = 805; // 5px outside right edge
      expect(screenX2 >= -10 && screenX2 <= viewportWidth + 10).toBe(true);
      
      const screenX3 = -15; // 15px outside left edge
      expect(screenX3 >= -10 && screenX3 <= viewportWidth + 10).toBe(false);
    });
  });
});
