/**
 * Unit tests for Paper hit-testing with distance adjustment
 * 
 * Tests Phase 55: Distance-Adjusted Hit-Testing
 * Points treated as small circles; adjusted_distance = actual_distance - 5px
 * 
 * @see frontend/src/domain/presentation/Paper.ts
 * @see specs/001-dihedral-learning-mvp/tasks.md Phase 55
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Matrix3 } from 'three';
import type { World } from '@/domain/world/World';
import { Paper, ViewportTransform } from '@/domain/presentation/Paper';
import { FreePoint2D } from '@/domain/world/Point';
import { DirectLine2D } from '@/domain/world/Line';
import { SelectionMask } from '@/types/SelectionMask';
import { getHorizontalPlaneId, createTestWorld } from '../../helpers/worldHelpers';

describe('Paper Hit-Testing - Distance Adjustment (Phase 55)', () => {
  let world: World;
  let paper: Paper;
  let planeId: string;
  let paperToPlaneTransform: Matrix3;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    paper = new Paper();
    
    // Set viewport transform (no zoom/pan for simplicity)
    const viewportTransform: ViewportTransform = {
      panX: 0,
      panY: 0,
      zoom: 1.0
    };
    paper.setViewportTransform(viewportTransform);
    
    planeId = getHorizontalPlaneId(world);
    const plane = world.getProjectionPlaneById(planeId);
    
    // Identity transform (paper space = plane space for testing)
    paperToPlaneTransform = new Matrix3().identity();
    
    // Note: ProjectionPlane transforms are computed from realizations,
    // not set directly. The identity paperToPlaneTransform handles the test case.
  });

  describe('T973: Point preferred when nearby', () => {
    it('should select point over line when point is closer after adjustment', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point away from origin (avoid O_H at 0,0)
      const point = plane.addFreePoint2D(new Vector3(20, 20, 1), world);
      point.label = 'A';
      
      // Create line through point
      const pointB = plane.addFreePoint2D(new Vector3(30, 20, 1), world);
      pointB.label = 'B';
      const line = plane.addLine2DBetweenTwoPoints(point.id!, pointB.id!, world);
      
      // Hit-test at (23, 20) - 3px from point, ~3px from line
      // Point adjusted distance: 3 - 5 = -2
      // Line distance: ~3
      // Point should win
      const canvasPos = new Vector3(23, 20, 1);
      const snapRadius = 20; // pixels
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
      expect(hit?.elementId).toBe(point.id);
    });
  });

  describe('T974: Line wins when significantly closer', () => {
    it('should select line over point when line is much closer', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point far away
      const point = plane.addFreePoint2D(new Vector3(50, 50, 1), world);
      point.label = 'A';
      
      // Create line away from any points (horizontal line from x=20 to x=80 at y=30)
      const pointB = plane.addFreePoint2D(new Vector3(20, 30, 1), world);
      pointB.label = 'B';
      const pointC = plane.addFreePoint2D(new Vector3(80, 30, 1), world);
      pointC.label = 'C';
      const line = plane.addLine2DBetweenTwoPoints(pointB.id!, pointC.id!, world);
      
      // Hit-test at (50, 31) - close to line middle, far from all points
      // Nearest created point (A) is at (50, 50): distance = 19px, adjusted = 19 - 5 = 14
      // Nearest line endpoint (B or C): both >20px away, adjusted >15
      // Line distance: ~1px
      // Line should win (1 < 14)
      const canvasPos = new Vector3(50, 31, 1);
      const snapRadius = 20; // pixels
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('line');
      // Verify we got a line (not the point)
      const selectedLine = plane.getLine(hit!.elementId);
      expect(selectedLine).toBeDefined();
    });
  });

  describe('T975: Point barely closer still wins', () => {
    it('should select point when point is barely closer after adjustment', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point at (7, 0)
      const point = plane.addFreePoint2D(new Vector3(7, 0, 1), world);
      point.label = 'A';
      
      // Create horizontal line at y=6
      const pointB = plane.addFreePoint2D(new Vector3(0, 6, 1), world);
      pointB.label = 'B';
      const pointC = plane.addFreePoint2D(new Vector3(10, 6, 1), world);
      pointC.label = 'C';
      const line = plane.addLine2DBetweenTwoPoints(pointB.id!, pointC.id!, world);
      
      // Hit-test at (4, 3) - approximately 5px from point, 3px from line
      // Point adjusted distance: 5 - 5 = 0
      // Line distance: 3
      // Point should win (0 < 3)
      const canvasPos = new Vector3(4, 3, 1);
      const snapRadius = 20; // pixels
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
      expect(hit?.elementId).toBe(point.id);
    });
  });

  describe('T976: Closest point wins among multiple points', () => {
    it('should select closest point when multiple points within radius', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create two points away from origin
      const pointA = plane.addFreePoint2D(new Vector3(20, 20, 1), world);
      pointA.label = 'A';
      const pointB = plane.addFreePoint2D(new Vector3(30, 20, 1), world);
      pointB.label = 'B';
      
      // Hit-test at (22, 20) - 2px from A, 8px from B
      // A adjusted distance: 2 - 5 = -3
      // B adjusted distance: 8 - 5 = 3
      // A should win (-3 < 3)
      const canvasPos = new Vector3(22, 20, 1);
      const snapRadius = 20; // pixels
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
      // Verify we got point A (the closer one)
      const selectedPoint = plane.getPoint(hit!.elementId);
      expect(selectedPoint?.label).toBe('A');
    });
  });

  describe('T977: Selection mask overrides distance', () => {
    it('should select line when mask excludes points', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point away from origin
      const point = plane.addFreePoint2D(new Vector3(20, 20, 1), world);
      point.label = 'A';
      
      // Create line through point
      const pointB = plane.addFreePoint2D(new Vector3(30, 20, 1), world);
      pointB.label = 'B';
      const line = plane.addLine2DBetweenTwoPoints(point.id!, pointB.id!, world);
      
      // Hit-test at point position with mask that excludes points
      const canvasPos = new Vector3(20, 20, 1);
      const snapRadius = 20; // pixels
      const selectionMask = SelectionMask.union(
        SelectionMask.line(),
        SelectionMask.segment()
      ); // Excludes 'point'
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world,
        selectionMask
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('line');
      // Verify a line was selected (points excluded by mask)
      const selectedLine = plane.getLine(hit!.elementId);
      expect(selectedLine).toBeDefined();
    });
  });

  describe('Distance adjustment constants', () => {
    it('should use 5px visual radius for point adjustment', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point away from origin
      const point = plane.addFreePoint2D(new Vector3(20, 20, 1), world);
      point.label = 'A';
      
      // Hit-test exactly 5px away
      // Point adjusted distance: 5 - 5 = 0 (should be selectable)
      const canvasPos = new Vector3(25, 20, 1);
      const snapRadius = 10; // pixels
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
    });

    it('should handle negative adjusted distances (cursor inside point radius)', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point away from origin
      const point = plane.addFreePoint2D(new Vector3(20, 20, 1), world);
      point.label = 'A';
      
      // Hit-test at 2px away (inside 5px visual radius)
      // Point adjusted distance: 2 - 5 = -3 (negative, but valid)
      const canvasPos = new Vector3(22, 20, 1);
      const snapRadius = 10; // pixels
      
      const hit = paper.hitTest(
        canvasPos,
        snapRadius,
        planeId,
        paperToPlaneTransform,
        world
      );
      
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
      const selectedPoint = plane.getPoint(hit!.elementId);
      expect(selectedPoint?.label).toBe('A');
    });
  });
});
