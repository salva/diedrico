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
import { World } from '@/domain/world/World';
import { Paper, ViewportTransform } from '@/domain/presentation/Paper';
import { FreePoint2D } from '@/domain/world/Point';
import { DirectLine2D } from '@/domain/world/Line';
import { getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('Paper Hit-Testing - Distance Adjustment (Phase 55)', () => {
  let world: World;
  let paper: Paper;
  let planeId: string;
  let paperToPlaneTransform: Matrix3;

  beforeEach(() => {
    world = new World();
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
    
    if (plane) {
      // Set plane transform to identity for testing
      plane.setTransform(new Matrix3().identity());
    }
  });

  describe('T973: Point preferred when nearby', () => {
    it('should select point over line when point is closer after adjustment', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point at origin
      const point = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      point.label = 'A';
      
      // Create line through origin
      const pointB = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      pointB.label = 'B';
      const line = plane.addLine2DBetweenTwoPoints(point.id!, pointB.id!, world);
      
      // Hit-test at (3, 0) - 3px from point, ~3px from line
      // Point adjusted distance: 3 - 5 = -2
      // Line distance: ~3
      // Point should win
      const canvasPos = new Vector3(3, 0, 1);
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
      
      // Create point far away at (10, 0)
      const point = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      point.label = 'A';
      
      // Create line near test position
      const pointB = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      pointB.label = 'B';
      const pointC = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      pointC.label = 'C';
      const line = plane.addLine2DBetweenTwoPoints(pointB.id!, pointC.id!, world);
      
      // Hit-test at (2, 0) - 8px from point, ~0px from line
      // Point adjusted distance: 8 - 5 = 3
      // Line distance: ~0
      // Line should win
      const canvasPos = new Vector3(2, 0, 1);
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
      expect(hit?.elementId).toBe(line.id);
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
      
      // Create two points
      const pointA = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      pointA.label = 'A';
      const pointB = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      pointB.label = 'B';
      
      // Hit-test at (2, 0) - 2px from A, 8px from B
      // A adjusted distance: 2 - 5 = -3
      // B adjusted distance: 8 - 5 = 3
      // A should win (-3 < 3)
      const canvasPos = new Vector3(2, 0, 1);
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
      expect(hit?.elementId).toBe(pointA.id);
    });
  });

  describe('T977: Selection mask overrides distance', () => {
    it('should select line when mask excludes points', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point at origin
      const point = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      point.label = 'A';
      
      // Create line through origin
      const pointB = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      pointB.label = 'B';
      const line = plane.addLine2DBetweenTwoPoints(point.id!, pointB.id!, world);
      
      // Hit-test at origin with mask that excludes points
      const canvasPos = new Vector3(0, 0, 1);
      const snapRadius = 20; // pixels
      const selectionMask = ['line', 'segment']; // Excludes 'point'
      
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
      expect(hit?.elementId).toBe(line.id);
    });
  });

  describe('Distance adjustment constants', () => {
    it('should use 5px visual radius for point adjustment', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      
      // Create point at origin
      const point = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      point.label = 'A';
      
      // Hit-test exactly 5px away
      // Point adjusted distance: 5 - 5 = 0 (should be selectable)
      const canvasPos = new Vector3(5, 0, 1);
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
      
      // Create point at origin
      const point = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      point.label = 'A';
      
      // Hit-test at 2px away (inside 5px visual radius)
      // Point adjusted distance: 2 - 5 = -3 (negative, but valid)
      const canvasPos = new Vector3(2, 0, 1);
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
      expect(hit?.elementId).toBe(point.id);
    });
  });
});
