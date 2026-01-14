/**
 * Tests for ProjectionPlane Realization Computation (Phase 22.5)
 * 
 * Verifies that realization computation has been moved from World to ProjectionPlane.
 * Tests that:
 * - Realizations are computed by ProjectionPlane methods
 * - Results are cached at the plane level
 * - World delegates to ProjectionPlane for computation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '../../../src/domain/world/World';
import { Segment2DByPoints } from '../../../src/domain/world/Segment';
import { Line2DByTwoPoints } from '../../../src/domain/world/Line';
import { Circle2DByCenterAndPoint } from '../../../src/domain/world/Circle';

describe('ProjectionPlane Realization Computation (Phase 22.5)', () => {
  let world: World;
  let planeH: any;
  let p1Id: string;
  let p2Id: string;

  beforeEach(() => {
    world = new World();
    planeH = world.getProjectionPlaneByLabel('P_H')!;
    
    // Create test points (let IDs auto-generate)
    const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
    const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
    
    p1Id = p1.id;
    p2Id = p2.id;
  });

  describe('Point realization computation', () => {
    it('ProjectionPlane.realizePoint2D() should compute and cache point realization', () => {
      const point = planeH.getPoint(p1Id)!;
      
      // Verify cache is empty initially
      expect(planeH.getPointRealization2D(p1Id)).toBeUndefined();
      
      // Compute realization via ProjectionPlane
      const realization = planeH.realizePoint2D(point, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.position.x).toBe(0);
      expect(realization!.position.y).toBe(0);
      
      // Verify cached in ProjectionPlane
      const cached = planeH.getPointRealization2D(p1Id);
      expect(cached).toBeDefined();
      expect(cached).toBe(realization);  // Same instance
    });

    it('Point.realize2D() should compute realization (without automatic caching)', () => {
      // Get the point element
      const point = planeH.getPoint(p1Id);
      expect(point).toBeDefined();
      
      // Call realize2D on the element - this computes fresh, no caching
      const realization = point!.realize2D(world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.position.x).toBe(0);
      expect(realization!.position.y).toBe(0);
      
      // Note: realize2D() doesn't automatically cache. Use plane.realizePoint2D() for caching.
    });

    it('subsequent calls should return cached realization', () => {
      const point = planeH.getPoint(p1Id)!;
      
      // First call - computes
      const first = planeH.realizePoint2D(point, world);
      
      // Second call - returns cached
      const second = planeH.realizePoint2D(point, world);
      
      expect(first).toBe(second);  // Same instance from cache
    });
  });

  describe('Line realization computation', () => {
    it('ProjectionPlane.realizeLine2D() should compute and cache line realization', () => {
      const line = planeH.addLine2DBetweenTwoPoints(p1Id, p2Id, world);
      
      // Verify cache is empty initially
      expect(planeH.getLineRealization2D(line.id)).toBeUndefined();
      
      // Compute realization via ProjectionPlane
      const realization = planeH.realizeLine2D(line, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(true);
      
      // Verify cached in ProjectionPlane
      const cached = planeH.getLineRealization2D(line.id);
      expect(cached).toBeDefined();
      expect(cached).toBe(realization);
    });

    it.skip('World.getLine2DRealization() - REMOVED IN PHASE 48', () => {
      // This test is skipped because world.getLine2DRealization() was removed in Phase 48
      // to enforce ProjectionPlane ownership. Use plane.realizeLine2D() instead.
    });

    it('should work for segments (Line2D subtypes)', () => {
      const segment = new Segment2DByPoints(planeH.id + '/seg1', p1Id, p2Id, planeH.id);
      world.addSegment2D(segment);
      
      // Compute via ProjectionPlane
      const realization = planeH.realizeLine2D(segment, world);
      
      // Verify segment realization has endpoints
      expect(realization).toBeDefined();
      expect(realization!.isBounded()).toBe(true);
      expect(realization!.point1).toBeDefined();
      expect(realization!.point2).toBeDefined();
      
      // Verify cached
      const cached = planeH.getLineRealization2D(segment.id);
      expect(cached).toBe(realization);
    });
  });

  describe('Circle realization computation', () => {
    it('ProjectionPlane.realizeCircle2D() should compute and cache circle realization', () => {
      // Create circumference point
      const p2 = planeH.addFreePoint2D(new Vector3(5, 0, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(p1Id, p2.id, world);
      
      // Verify cache is empty initially
      expect(planeH.getCircleRealization2D(circle.id)).toBeUndefined();
      
      // Compute realization via ProjectionPlane
      const realization = planeH.realizeCircle2D(circle, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.center.x).toBe(0);
      expect(realization!.center.y).toBe(0);
      expect(realization!.getRadius()).toBe(5);
      
      // Verify cached in ProjectionPlane
      const cached = planeH.getCircleRealization2D(circle.id);
      expect(cached).toBeDefined();
      expect(cached).toBe(realization);
    });

    it.skip('World.getCircle2DRealization() - REMOVED IN PHASE 48', () => {
      // This test is skipped because world.getCircle2DRealization() was removed in Phase 48
      // to enforce ProjectionPlane ownership. Use plane.realizeCircle2D() instead.
    });
  });

  describe('Cache isolation between planes', () => {
    it('realizations should be cached per plane', () => {
      const planeV = world.getProjectionPlaneByLabel('P_V')!;
      
      // Add points to both planes (no hardcoded IDs)
      const p1H = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
      const p1V = planeV.addFreePoint2D(new Vector3(5, 5, 1), world);
      
      // Realize via plane methods
      planeH.realizePoint2D(p1H, world);
      planeV.realizePoint2D(p1V, world);
      
      // Verify cached in correct planes
      expect(planeH.getPointRealization2D(p1H.id)).toBeDefined();
      expect(planeH.getPointRealization2D(p1V.id)).toBeUndefined();  // Wrong plane
      
      expect(planeV.getPointRealization2D(p1V.id)).toBeDefined();
      expect(planeV.getPointRealization2D(p1H.id)).toBeUndefined();  // Wrong plane
    });
  });

  describe.skip('Dual storage during migration - OBSOLETE AFTER PHASE 48', () => {
    it('World cache removed in Phase 48', () => {
      // This test suite is skipped because Phase 48 removed World facade methods.
      // ProjectionPlane is now the sole owner of realization caching.
    });
  });
});
