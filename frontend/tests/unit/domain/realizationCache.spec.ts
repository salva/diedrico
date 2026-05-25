/**
 * Tests for per-plane realization cache correctness (Phase 119)
 *
 * Verifies cache hit, invalidation, dependency cascade, cross-plane
 * propagation, and full cache clear for ProjectionPlane realization caches.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import type { World } from '@/domain/world/World';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Per-Plane Realization Cache (Phase 119)', () => {
  let world: World;
  let planeH: ProjectionPlane;
  let planeV: ProjectionPlane;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeH = world.getProjectionPlaneByLabel('P_H')!;
    planeV = world.getProjectionPlaneByLabel('P_V')!;
  });

  // ── T1913: Cache hit — same object reference on repeated calls ──

  describe('Cache hit (T1913)', () => {
    it('realizePoint2D returns same instance on second call', () => {
      const p = planeH.addFreePoint2D(new Vector3(3, 4, 1), world);

      const first = planeH.realizePoint2D(p, world);
      const second = planeH.realizePoint2D(p, world);

      expect(first).toBeDefined();
      expect(second).toBe(first); // exact same reference
    });

    it('realizeLine2D returns same instance on second call', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

      const first = planeH.realizeLine2D(line, world);
      const second = planeH.realizeLine2D(line, world);

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });

    it('realizeCircle2D returns same instance on second call', () => {
      const center = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const circumPt = planeH.addFreePoint2D(new Vector3(5, 0, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, circumPt.id, world);

      const first = planeH.realizeCircle2D(circle, world);
      const second = planeH.realizeCircle2D(circle, world);

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });

    it('cache getter returns the exact cached realization', () => {
      const p = planeH.addFreePoint2D(new Vector3(1, 2, 1), world);

      expect(planeH.getPointRealization2D(p.id)).toBeUndefined();
      const realized = planeH.realizePoint2D(p, world);
      expect(planeH.getPointRealization2D(p.id)).toBe(realized);
    });
  });

  // ── T1914: Cache invalidation via World.invalidateRealization ──

  describe('Cache invalidation (T1914)', () => {
    it('invalidateRealization clears point cache; next call returns fresh object', () => {
      const p = planeH.addFreePoint2D(new Vector3(7, 8, 1), world);
      const first = planeH.realizePoint2D(p, world);

      world.invalidateRealization(p.id);

      expect(planeH.getPointRealization2D(p.id)).toBeUndefined();

      const second = planeH.realizePoint2D(p, world);
      expect(second).toBeDefined();
      expect(second).not.toBe(first); // new instance after invalidation
    });

    it('invalidateRealization clears line cache for the same element', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

      planeH.realizeLine2D(line, world);
      expect(planeH.getLineRealization2D(line.id)).toBeDefined();

      // Invalidating a parent point cascades to the line
      world.invalidateRealization(p1.id);
      expect(planeH.getLineRealization2D(line.id)).toBeUndefined();
    });

    it('invalidateRealization clears circle cache when center point invalidated', () => {
      const center = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const circumPt = planeH.addFreePoint2D(new Vector3(3, 0, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, circumPt.id, world);

      planeH.realizeCircle2D(circle, world);
      expect(planeH.getCircleRealization2D(circle.id)).toBeDefined();

      world.invalidateRealization(center.id);
      expect(planeH.getCircleRealization2D(circle.id)).toBeUndefined();
    });
  });

  // ── T1915: Dependency propagation — parent change invalidates child ──

  describe('Dependency propagation (T1915)', () => {
    it('invalidating a point clears dependent line on same plane', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

      // Populate all caches
      const pReal = planeH.realizePoint2D(p1, world);
      const p2Real = planeH.realizePoint2D(p2, world);
      const lReal = planeH.realizeLine2D(line, world);
      expect(pReal).toBeDefined();
      expect(p2Real).toBeDefined();
      expect(lReal).toBeDefined();

      // Invalidate root point → line should also be cleared
      world.invalidateRealization(p1.id);

      expect(planeH.getPointRealization2D(p1.id)).toBeUndefined();
      expect(planeH.getLineRealization2D(line.id)).toBeUndefined();
      // Sibling point (p2) not dependent on p1, so should remain cached
      expect(planeH.getPointRealization2D(p2.id)).toBeDefined();
    });

    it('invalidating a point clears dependent circle on same plane', () => {
      const center = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const circPt = planeH.addFreePoint2D(new Vector3(4, 0, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, circPt.id, world);

      planeH.realizePoint2D(center, world);
      planeH.realizePoint2D(circPt, world);
      planeH.realizeCircle2D(circle, world);

      world.invalidateRealization(center.id);

      expect(planeH.getCircleRealization2D(circle.id)).toBeUndefined();
      // circPt is independent of center, cache untouched
      expect(planeH.getPointRealization2D(circPt.id)).toBeDefined();
    });

    it('two-level cascade: point → line → intersection point', () => {
      // p1, p2 define line1; p3, p4 define line2; they intersect
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
      const p3 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
      const p4 = planeH.addFreePoint2D(new Vector3(5,  5, 1), world);
      const line1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const line2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world);

      const intPt = planeH.addLineLineIntersection(line1.id, line2.id, world);

      // Realize everything
      planeH.realizePoint2D(p1, world);
      planeH.realizePoint2D(p2, world);
      planeH.realizePoint2D(p3, world);
      planeH.realizePoint2D(p4, world);
      planeH.realizeLine2D(line1, world);
      planeH.realizeLine2D(line2, world);
      planeH.realizePoint2D(intPt, world);

      // Invalidate p1 → line1 → intersection
      world.invalidateRealization(p1.id);

      expect(planeH.getPointRealization2D(p1.id)).toBeUndefined();
      expect(planeH.getLineRealization2D(line1.id)).toBeUndefined();
      expect(planeH.getPointRealization2D(intPt.id)).toBeUndefined();

      // line2 and its defining points should be untouched
      expect(planeH.getLineRealization2D(line2.id)).toBeDefined();
      expect(planeH.getPointRealization2D(p3.id)).toBeDefined();
      expect(planeH.getPointRealization2D(p4.id)).toBeDefined();
    });
  });

  // ── T1916: Cross-plane cache clearing on invalidation ──

  describe('Cross-plane propagation (T1916)', () => {
    it('invalidateRealization clears caches across ALL planes', () => {
      // Add a point to P_H and a different point to P_V
      const pH = planeH.addFreePoint2D(new Vector3(2, 3, 1), world);
      const pV = planeV.addFreePoint2D(new Vector3(7, 8, 1), world);

      planeH.realizePoint2D(pH, world);
      planeV.realizePoint2D(pV, world);

      // Invalidate pH → should clear pH's cache in ALL planes (even though it's only on P_H)
      world.invalidateRealization(pH.id);

      expect(planeH.getPointRealization2D(pH.id)).toBeUndefined();
      // pV is independent, should remain cached
      expect(planeV.getPointRealization2D(pV.id)).toBeDefined();
    });

    it('invalidation on one plane does not clear unrelated caches on other plane', () => {
      const pA = planeH.addFreePoint2D(new Vector3(1, 1, 1), world);
      const pB = planeH.addFreePoint2D(new Vector3(5, 1, 1), world);
      const pC = planeV.addFreePoint2D(new Vector3(2, 2, 1), world);
      const pD = planeV.addFreePoint2D(new Vector3(8, 2, 1), world);

      const lineH = planeH.addLine2DBetweenTwoPoints(pA.id, pB.id, world);
      const lineV = planeV.addLine2DBetweenTwoPoints(pC.id, pD.id, world);

      // Realize everything
      planeH.realizePoint2D(pA, world);
      planeH.realizePoint2D(pB, world);
      planeH.realizeLine2D(lineH, world);
      planeV.realizePoint2D(pC, world);
      planeV.realizePoint2D(pD, world);
      planeV.realizeLine2D(lineV, world);

      // Invalidate pA → cascades to lineH, but nothing on P_V linked
      world.invalidateRealization(pA.id);

      expect(planeH.getPointRealization2D(pA.id)).toBeUndefined();
      expect(planeH.getLineRealization2D(lineH.id)).toBeUndefined();

      // P_V caches untouched
      expect(planeV.getPointRealization2D(pC.id)).toBeDefined();
      expect(planeV.getPointRealization2D(pD.id)).toBeDefined();
      expect(planeV.getLineRealization2D(lineV.id)).toBeDefined();
    });
  });

  // ── T1917: Full cache clear via ProjectionPlane.clear() ──

  describe('Full cache clear (T1917)', () => {
    it('clear() empties all point, line, and circle realization caches', () => {
      const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const circle = planeH.addCircle2DByCenterAndPoint(p1.id, p2.id, world);

      // Populate all caches
      planeH.realizePoint2D(p1, world);
      planeH.realizePoint2D(p2, world);
      planeH.realizeLine2D(line, world);
      planeH.realizeCircle2D(circle, world);

      expect(planeH.getPointRealization2D(p1.id)).toBeDefined();
      expect(planeH.getPointRealization2D(p2.id)).toBeDefined();
      expect(planeH.getLineRealization2D(line.id)).toBeDefined();
      expect(planeH.getCircleRealization2D(circle.id)).toBeDefined();

      planeH.clear();

      expect(planeH.getPointRealization2D(p1.id)).toBeUndefined();
      expect(planeH.getPointRealization2D(p2.id)).toBeUndefined();
      expect(planeH.getLineRealization2D(line.id)).toBeUndefined();
      expect(planeH.getCircleRealization2D(circle.id)).toBeUndefined();
    });

    it('clear() on one plane does not affect other planes', () => {
      const pH = planeH.addFreePoint2D(new Vector3(1, 1, 1), world);
      const pV = planeV.addFreePoint2D(new Vector3(2, 2, 1), world);

      planeH.realizePoint2D(pH, world);
      planeV.realizePoint2D(pV, world);

      planeH.clear();

      expect(planeH.getPointRealization2D(pH.id)).toBeUndefined();
      expect(planeV.getPointRealization2D(pV.id)).toBeDefined(); // untouched
    });
  });
});
