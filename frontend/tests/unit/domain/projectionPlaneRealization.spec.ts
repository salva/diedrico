/**
 * Tests for centralized realization computation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import type { World } from '../../../src/domain/world/World';
import { Segment2D } from '../../../src/domain/world/Segment';
import { Line2DByTwoPoints } from '../../../src/domain/world/Line';
import { Circle2DByCenterAndPoint } from '../../../src/domain/world/Circle';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('World realization facade', () => {
  let world: World;
  let planeH: any;
  let p1Id: string;
  let p2Id: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeH = world.getProjectionPlaneByLabel('P_H')!;
    
    // Create test points (let IDs auto-generate)
    const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
    const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 10, 1));
    
    p1Id = p1.id;
    p2Id = p2.id;
  });

  describe('Point realization computation', () => {
    it('World.realizePoint2D() should compute point realization', () => {
      const point = planeH.getPoint(p1Id)!;
      const realization = world.realizePoint2D(point, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.position.x).toBe(0);
      expect(realization!.position.y).toBe(0);
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
      
      // Note: realize2D() doesn't automatically cache. Use world.realizePoint2D() for caching.
    });

    it('subsequent calls should return cached realization', () => {
      const point = planeH.getPoint(p1Id)!;
      
      // First call - computes
      const first = world.realizePoint2D(point, world);
      
      // Second call - returns cached
      const second = world.realizePoint2D(point, world);
      
      expect(first).toBe(second);  // Same instance from cache
    });
  });

  describe('Line realization computation', () => {
    it('World.realizeLine2D() should compute and cache line realization', () => {
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1Id, p2Id);
      const realization = world.realizeLine2D(line, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(true);
      expect(world.realizeLine2D(line, world)).toBe(realization);
    });

    it.skip('World.getLine2DRealization() - REMOVED IN PHASE 48', () => {
      // This test is skipped because world.getLine2DRealization() was removed in Phase 48
      // to enforce ProjectionPlane ownership.
    });

    it('should work for segments (Line2D subtypes)', () => {
      const segment = new Segment2D(planeH.id + '/seg1', p1Id, p2Id, planeH.id);
      planeH.addLine(segment);
      
      const realization = world.realizeLine2D(segment, world);
      
      // Verify segment realization has endpoints
      expect(realization).toBeDefined();
      expect(realization!.isBounded()).toBe(true);
      expect(realization!.point1).toBeDefined();
      expect(realization!.point2).toBeDefined();
      
      expect(world.realizeLine2D(segment, world)).toBe(realization);
    });
  });

  describe('Circle realization computation', () => {
    it('World.realizeCircle2D() should compute and cache circle realization', () => {
      // Create circumference point
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, p1Id, p2.id);
      
      const realization = world.realizeCircle2D(circle, world);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.center.x).toBe(0);
      expect(realization!.center.y).toBe(0);
      expect(realization!.getRadius()).toBe(5);
      expect(world.realizeCircle2D(circle, world)).toBe(realization);
    });

    it.skip('World.getCircle2DRealization() - REMOVED IN PHASE 48', () => {
      // This test is skipped because world.getCircle2DRealization() was removed in Phase 48
      // to enforce ProjectionPlane ownership.
    });
  });

  describe('Cache isolation between elements', () => {
    it('invalidating one point does not clear an unrelated point', () => {
      const planeV = world.getProjectionPlaneByLabel('P_V')!;
      
      // Add points to both planes (no hardcoded IDs)
      const p1H = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 5, 1));
      const p1V = world.getConstructionService().addFreePoint2D(planeV, new Vector3(5, 5, 1));
      
      const firstH = world.realizePoint2D(p1H, world);
      const firstV = world.realizePoint2D(p1V, world);

      world.invalidateRealization(p1H.id);

      expect(world.realizePoint2D(p1H, world)).not.toBe(firstH);
      expect(world.realizePoint2D(p1V, world)).toBe(firstV);
    });
  });

  describe.skip('Dual storage during migration - OBSOLETE AFTER PHASE 48', () => {
    it('World cache removed in Phase 48', () => {
      // This test suite is skipped because Phase 48 removed World facade methods.
      // ProjectionPlane is now the sole owner of realization caching.
    });
  });
});
