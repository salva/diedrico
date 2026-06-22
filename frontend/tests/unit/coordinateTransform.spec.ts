/**
 * Tests for coordinate transformation round-trips
 * Verifies that transformations preserve coordinates through the full pipeline:
 * Screen → Canvas → Paper → Plane → Paper → Canvas → Screen
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { FixedProjectionPlane } from '@/domain/world/projectionPlane/FixedProjectionPlane';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../helpers/worldHelpers';
import { canvasToPlaneCoordinates, type ViewportTransform } from '@/application/canvas/CanvasCoordinateConverter';

describe('Coordinate Transformation Round-Trips', () => {
  const { world } = createTestWorld(); // Initialize world with planes
  
  describe('P_H (Horizontal Plane)', () => {
    it('should preserve screen coordinates through full round-trip', () => {
      const planeH = getHorizontalPlane(world);
      const realization = planeH.realize2D();
      
      const viewport: ViewportTransform = {
        zoom: 1.5,
        panX: 50,
        panY: 30
      };
      
      // Forward: Screen → Canvas → Paper → Plane
      const screenX = 100;
      const screenY = 150;
      const canvasX = screenX;
      const canvasY = screenY;
      
      const planePos = canvasToPlaneCoordinates(
        { x: canvasX, y: canvasY },
        realization.paperToPlane2D,
        viewport
      );
      
      // Reverse: Plane → Paper → Canvas → Screen
      const paperPos = planePos!.clone().applyMatrix3(realization.planeToPaper2D);
      const canvasX2 = (paperPos.x + viewport.panX) * viewport.zoom;
      const canvasY2 = (paperPos.y + viewport.panY) * viewport.zoom;
      const screenX2 = canvasX2;
      const screenY2 = canvasY2;
      
      // Verify coordinates are preserved
      expect(screenX2).toBeCloseTo(screenX);
      expect(screenY2).toBeCloseTo(screenY);
    });
    
    it('should work with arbitrary screen coordinates', () => {
      const planeH = getHorizontalPlane(world);
      const realization = planeH.realize2D();
      
      const viewport: ViewportTransform = {
        zoom: 2.0,
        panX: -25,
        panY: 10
      };
      
      const testCases = [
        { x: 0, y: 0 },
        { x: 237.5, y: 311.45 },
        { x: -100, y: -200 },
        { x: 1000, y: 800 }
      ];
      
      testCases.forEach(({ x, y }) => {
        const planePos = canvasToPlaneCoordinates(
          { x, y },
          realization.paperToPlane2D,
          viewport
        );
        
        const paperPos = planePos!.clone().applyMatrix3(realization.planeToPaper2D);
        const canvasX = (paperPos.x + viewport.panX) * viewport.zoom;
        const canvasY = (paperPos.y + viewport.panY) * viewport.zoom;
        
        expect(canvasX).toBeCloseTo(x);
        expect(canvasY).toBeCloseTo(y);
      });
    });
  });
  
  describe('P_V (Vertical Plane)', () => {
    it('should preserve screen coordinates through full round-trip', () => {
      const planeV = getVerticalPlane(world);
      const realization = planeV.realize2D();
      
      const viewport: ViewportTransform = {
        zoom: 1.0,
        panX: 0,
        panY: 0
      };
      
      const screenX = 200;
      const screenY = 300;
      
      const planePos = canvasToPlaneCoordinates(
        { x: screenX, y: screenY },
        realization.paperToPlane2D,
        viewport
      );
      
      const paperPos = planePos!.clone().applyMatrix3(realization.planeToPaper2D);
      const canvasX = (paperPos.x + viewport.panX) * viewport.zoom;
      const canvasY = (paperPos.y + viewport.panY) * viewport.zoom;
      
      expect(canvasX).toBeCloseTo(screenX);
      expect(canvasY).toBeCloseTo(screenY);
    });
    
    it('should work with different viewport transforms', () => {
      const planeV = getVerticalPlane(world);
      const realization = planeV.realize2D();
      
      const viewports: ViewportTransform[] = [
        { zoom: 1.0, panX: 0, panY: 0 },
        { zoom: 0.5, panX: 100, panY: -50 },
        { zoom: 3.0, panX: -200, panY: 150 }
      ];
      
      const testPoint = { x: 150, y: 250 };
      
      viewports.forEach(viewport => {
        const planePos = canvasToPlaneCoordinates(
          testPoint,
          realization.paperToPlane2D,
          viewport
        );
        
        const paperPos = planePos!.clone().applyMatrix3(realization.planeToPaper2D);
        const canvasX = (paperPos.x + viewport.panX) * viewport.zoom;
        const canvasY = (paperPos.y + viewport.panY) * viewport.zoom;
        
        expect(canvasX).toBeCloseTo(testPoint.x);
        expect(canvasY).toBeCloseTo(testPoint.y);
      });
    });
  });
  
  describe('Coordinate Invariants', () => {
    it('should preserve w=1 for homogeneous coordinates throughout', () => {
      const planeH = getHorizontalPlane(world);
      const realization = planeH.realize2D();
      
      const viewport: ViewportTransform = {
        zoom: 1.5,
        panX: 10,
        panY: 20
      };
      
      const canvasX = 100;
      const canvasY = 150;
      
      // Forward transform
      const planePos = canvasToPlaneCoordinates(
        { x: canvasX, y: canvasY },
        realization.paperToPlane2D,
        viewport
      );
      
      // w coordinate should always be 1
      expect(planePos!.z).toBe(1);
      
      // Reverse transform
      const paperPos = planePos!.clone().applyMatrix3(realization.planeToPaper2D);
      expect(paperPos.z).toBe(1);
    });
    
    it('should maintain numerical stability across multiple round-trips', () => {
      const planeH = getHorizontalPlane(world);
      const realization = planeH.realize2D();
      
      const viewport: ViewportTransform = {
        zoom: 1.5,
        panX: 50,
        panY: 30
      };
      
      let x = 123.456;
      let y = 789.012;
      
      // Perform 10 round-trips
      for (let i = 0; i < 10; i++) {
        const planePos = canvasToPlaneCoordinates(
          { x, y },
          realization.paperToPlane2D,
          viewport
        );
        
        const paperPos = planePos!.clone().applyMatrix3(realization.planeToPaper2D);
        x = (paperPos.x + viewport.panX) * viewport.zoom;
        y = (paperPos.y + viewport.panY) * viewport.zoom;
      }
      
      // After 10 round-trips, should still match original (within floating point tolerance)
      expect(x).toBeCloseTo(123.456, 10); // 10 decimal places
      expect(y).toBeCloseTo(789.012, 10);
    });
  });
});
