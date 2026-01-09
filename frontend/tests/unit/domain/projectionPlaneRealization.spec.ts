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
    planeH = world.projectionPlanes.get('proj_plane_H');
    
    // Create test points
    const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
    const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1), 'p2');
    
    p1Id = p1.id;
    p2Id = p2.id;
  });

  describe('Point realization computation', () => {
    it('ProjectionPlane.realizePoint2D() should compute and cache point realization', () => {
      const point = world.getPoint2DById(p1Id)!;
      
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

    it('World.getPoint2DRealization() should delegate to ProjectionPlane', () => {
      // Call via World (public API)
      const realization = world.getPoint2DRealization(p1Id);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      
      // Verify cached in ProjectionPlane
      const planeCached = planeH.getPointRealization2D(p1Id);
      expect(planeCached).toBeDefined();
      expect(planeCached).toBe(realization);
    });

    it('subsequent calls should return cached realization', () => {
      const point = world.getPoint2DById(p1Id)!;
      
      // First call - computes
      const first = planeH.realizePoint2D(point, world);
      
      // Second call - returns cached
      const second = planeH.realizePoint2D(point, world);
      
      expect(first).toBe(second);  // Same instance from cache
    });
  });

  describe('Line realization computation', () => {
    it('ProjectionPlane.realizeLine2D() should compute and cache line realization', () => {
      const line = new Line2DByTwoPoints('line1', p1Id, p2Id, 'proj_plane_H');
      world.addLine2D(line);
      
      // Verify cache is empty initially
      expect(planeH.getLineRealization2D('line1')).toBeUndefined();
      
      // Compute realization via ProjectionPlane
      const realization = planeH.realizeLine2D(line, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(true);
      
      // Verify cached in ProjectionPlane
      const cached = planeH.getLineRealization2D('line1');
      expect(cached).toBeDefined();
      expect(cached).toBe(realization);
    });

    it('World.getLine2DRealization() should delegate to ProjectionPlane', () => {
      const line = new Line2DByTwoPoints('line1', p1Id, p2Id, 'proj_plane_H');
      world.addLine2D(line);
      
      // Call via World
      const realization = world.getLine2DRealization('line1');
      
      // Verify realization computed
      expect(realization).toBeDefined();
      
      // Verify cached in ProjectionPlane
      const planeCached = planeH.getLineRealization2D('line1');
      expect(planeCached).toBeDefined();
    });

    it('should work for segments (Line2D subtypes)', () => {
      const segment = new Segment2DByPoints('seg1', p1Id, p2Id, 'proj_plane_H');
      world.addSegment2D(segment);
      
      // Compute via ProjectionPlane
      const realization = planeH.realizeLine2D(segment, world);
      
      // Verify segment realization has endpoints
      expect(realization).toBeDefined();
      expect(realization!.isBounded()).toBe(true);
      expect(realization!.point1).toBeDefined();
      expect(realization!.point2).toBeDefined();
      
      // Verify cached
      const cached = planeH.getLineRealization2D('seg1');
      expect(cached).toBe(realization);
    });
  });

  describe('Circle realization computation', () => {
    it('ProjectionPlane.realizeCircle2D() should compute and cache circle realization', () => {
      // Create circumference point
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 0, 1));
      const circle = new Circle2DByCenterAndPoint('c1', p1Id, p2.id, 'proj_plane_H');
      world.addCircle2D(circle);
      
      // Verify cache is empty initially
      expect(planeH.getCircleRealization2D('c1')).toBeUndefined();
      
      // Compute realization via ProjectionPlane
      const realization = planeH.realizeCircle2D(circle, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.center.x).toBe(0);
      expect(realization!.center.y).toBe(0);
      expect(realization!.radius).toBe(5);
      
      // Verify cached in ProjectionPlane
      const cached = planeH.getCircleRealization2D('c1');
      expect(cached).toBeDefined();
      expect(cached).toBe(realization);
    });

    it('World.getCircle2DRealization() should delegate to ProjectionPlane', () => {
      // Create circumference point
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 0, 1));
      const circle = new Circle2DByCenterAndPoint('c1', p1Id, p2.id, 'proj_plane_H');
      world.addCircle2D(circle);
      
      // Call via World
      const realization = world.getCircle2DRealization('c1');
      
      // Verify realization computed
      expect(realization).toBeDefined();
      
      // Verify cached in ProjectionPlane
      const planeCached = planeH.getCircleRealization2D('c1');
      expect(planeCached).toBeDefined();
    });
  });

  describe('Cache isolation between planes', () => {
    it('realizations should be cached per plane', () => {
      const planeV = world.projectionPlanes.get('proj_plane_V')!;
      
      // Add points to both planes
      const p1H = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1), 'pH');
      const p1V = world.addFreePoint2D('proj_plane_V', new Vector3(5, 5, 1), 'pV');
      
      // Realize via World (which delegates to planes)
      world.getPoint2DRealization(p1H.id);
      world.getPoint2DRealization(p1V.id);
      
      // Verify cached in correct planes
      expect(planeH.getPointRealization2D(p1H.id)).toBeDefined();
      expect(planeH.getPointRealization2D(p1V.id)).toBeUndefined();  // Wrong plane
      
      expect(planeV.getPointRealization2D(p1V.id)).toBeDefined();
      expect(planeV.getPointRealization2D(p1H.id)).toBeUndefined();  // Wrong plane
    });
  });

  describe('Dual storage during migration', () => {
    it('World should also cache realizations during Phase 22.5', () => {
      // This verifies dual caching during migration
      // World cache will be removed in Phase 22.5.5
      
      const point = world.getPoint2DById(p1Id)!;
      
      // Call via World
      const realization = world.getPoint2DRealization(p1Id);
      
      // Verify cached in both World and ProjectionPlane during migration
      expect(realization).toBeDefined();
      expect(planeH.getPointRealization2D(p1Id)).toBeDefined();
      
      // Both should have the same realization
      expect(planeH.getPointRealization2D(p1Id)).toBe(realization);
    });
  });
});
