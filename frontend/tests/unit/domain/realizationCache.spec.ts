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
      const p = world.getConstructionService().addFreePoint2D(planeH, new Vector3(3, 4, 1));

      const first = world.realizePoint2D(p, world);
      const second = world.realizePoint2D(p, world);

      expect(first).toBeDefined();
      expect(second).toBe(first); // exact same reference
    });

    it('realizeLine2D returns same instance on second call', () => {
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 5, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

      const first = world.realizeLine2D(line, world);
      const second = world.realizeLine2D(line, world);

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });

    it('realizeCircle2D returns same instance on second call', () => {
      const center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const circumPt = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, center.id, circumPt.id);

      const first = world.realizeCircle2D(circle, world);
      const second = world.realizeCircle2D(circle, world);

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });

    it('subsequent facade calls return the exact cached realization', () => {
      const p = world.getConstructionService().addFreePoint2D(planeH, new Vector3(1, 2, 1));

      const realized = world.realizePoint2D(p, world);
      expect(world.realizePoint2D(p, world)).toBe(realized);
    });
  });

  // ── T1914: Cache invalidation via World.invalidateRealization ──

  describe('Cache invalidation (T1914)', () => {
    it('invalidateRealization clears point cache; next call returns fresh object', () => {
      const p = world.getConstructionService().addFreePoint2D(planeH, new Vector3(7, 8, 1));
      const first = world.realizePoint2D(p, world);

      world.invalidateRealization(p.id);

      const second = world.realizePoint2D(p, world);
      expect(second).toBeDefined();
      expect(second).not.toBe(first); // new instance after invalidation
    });

    it('invalidateRealization clears line cache for the same element', () => {
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 0, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

      const first = world.realizeLine2D(line, world);

      // Invalidating a parent point cascades to the line
      world.invalidateRealization(p1.id);
      expect(world.realizeLine2D(line, world)).not.toBe(first);
    });

    it('invalidateRealization clears circle cache when center point invalidated', () => {
      const center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const circumPt = world.getConstructionService().addFreePoint2D(planeH, new Vector3(3, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, center.id, circumPt.id);

      const first = world.realizeCircle2D(circle, world);

      world.invalidateRealization(center.id);
      expect(world.realizeCircle2D(circle, world)).not.toBe(first);
    });
  });

  // ── T1915: Dependency propagation — parent change invalidates child ──

  describe('Dependency propagation (T1915)', () => {
    it('invalidating a point clears dependent line on same plane', () => {
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 10, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

      // Populate all caches
      const pReal = world.realizePoint2D(p1, world);
      const p2Real = world.realizePoint2D(p2, world);
      const lReal = world.realizeLine2D(line, world);
      expect(pReal).toBeDefined();
      expect(p2Real).toBeDefined();
      expect(lReal).toBeDefined();

      // Invalidate root point → line should also be cleared
      world.invalidateRealization(p1.id);

      expect(world.realizePoint2D(p1, world)).not.toBe(pReal);
      expect(world.realizeLine2D(line, world)).not.toBe(lReal);
      // Sibling point (p2) not dependent on p1, so should remain cached
      expect(world.realizePoint2D(p2, world)).toBe(p2Real);
    });

    it('invalidating a point clears dependent circle on same plane', () => {
      const center = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(planeH, new Vector3(4, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(planeH, center.id, circPt.id);

      world.realizePoint2D(center, world);
      const circPtRealization = world.realizePoint2D(circPt, world);
      const circleRealization = world.realizeCircle2D(circle, world);

      world.invalidateRealization(center.id);

      expect(world.realizeCircle2D(circle, world)).not.toBe(circleRealization);
      // circPt is independent of center, cache untouched
      expect(world.realizePoint2D(circPt, world)).toBe(circPtRealization);
    });

    it('two-level cascade: point → line → intersection point', () => {
      // p1, p2 define line1; p3, p4 define line2; they intersect
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(10, 0, 1));
      const p3 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, -5, 1));
      const p4 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5,  5, 1));
      const line1 = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      const line2 = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, p3.id, p4.id);

      const intPt = world.getConstructionService().addLineLineIntersection(planeH, line1.id, line2.id);

      // Realize everything
      const p1Realization = world.realizePoint2D(p1, world);
      world.realizePoint2D(p2, world);
      const p3Realization = world.realizePoint2D(p3, world);
      const p4Realization = world.realizePoint2D(p4, world);
      const line1Realization = world.realizeLine2D(line1, world);
      const line2Realization = world.realizeLine2D(line2, world);
      const intPtRealization = world.realizePoint2D(intPt, world);

      // Invalidate p1 → line1 → intersection
      world.invalidateRealization(p1.id);

      expect(world.realizePoint2D(p1, world)).not.toBe(p1Realization);
      expect(world.realizeLine2D(line1, world)).not.toBe(line1Realization);
      expect(world.realizePoint2D(intPt, world)).not.toBe(intPtRealization);

      // line2 and its defining points should be untouched
      expect(world.realizeLine2D(line2, world)).toBe(line2Realization);
      expect(world.realizePoint2D(p3, world)).toBe(p3Realization);
      expect(world.realizePoint2D(p4, world)).toBe(p4Realization);
    });
  });

  // ── T1916: Cross-plane cache clearing on invalidation ──

  describe('Cross-plane propagation (T1916)', () => {
    it('invalidateRealization clears caches across ALL planes', () => {
      // Add a point to P_H and a different point to P_V
      const pH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(2, 3, 1));
      const pV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(7, 8, 1));

      const firstH = world.realizePoint2D(pH, world);
      const firstV = world.realizePoint2D(pV, world);

      // Invalidate pH → should clear pH's cache in ALL planes (even though it's only on P_H)
      world.invalidateRealization(pH.id);

      expect(world.realizePoint2D(pH, world)).not.toBe(firstH);
      // pV is independent, should remain cached
      expect(world.realizePoint2D(pV, world)).toBe(firstV);
    });

    it('invalidation on one plane does not clear unrelated caches on other plane', () => {
      const pA = world.getConstructionService().addFreePoint2D(planeH, new Vector3(1, 1, 1));
      const pB = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 1, 1));
      const pC = world.getConstructionService().addFreePoint2D(planeV, new Vector3(2, 2, 1));
      const pD = world.getConstructionService().addFreePoint2D(planeV, new Vector3(8, 2, 1));

      const lineH = world.getConstructionService().addLine2DBetweenTwoPoints(planeH, pA.id, pB.id);
      const lineV = world.getConstructionService().addLine2DBetweenTwoPoints(planeV, pC.id, pD.id);

      // Realize everything
      const pARealization = world.realizePoint2D(pA, world);
      world.realizePoint2D(pB, world);
      const lineHRealization = world.realizeLine2D(lineH, world);
      const pCRealization = world.realizePoint2D(pC, world);
      const pDRealization = world.realizePoint2D(pD, world);
      const lineVRealization = world.realizeLine2D(lineV, world);

      // Invalidate pA → cascades to lineH, but nothing on P_V linked
      world.invalidateRealization(pA.id);

      expect(world.realizePoint2D(pA, world)).not.toBe(pARealization);
      expect(world.realizeLine2D(lineH, world)).not.toBe(lineHRealization);

      // P_V caches untouched
      expect(world.realizePoint2D(pC, world)).toBe(pCRealization);
      expect(world.realizePoint2D(pD, world)).toBe(pDRealization);
      expect(world.realizeLine2D(lineV, world)).toBe(lineVRealization);
    });
  });

  // ── T1917: Full cache clear via World.clear() ──

  describe('Full cache clear (T1917)', () => {
    it('World.clear() empties all point, line, and circle realization caches', () => {
      const p1 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 5, 1));
      const p1Realization = world.realizePoint2D(p1, world);
      const p2Realization = world.realizePoint2D(p2, world);

      world.clear();

      expect(world.realizePoint2D(p1, world)).not.toBe(p1Realization);
      expect(world.realizePoint2D(p2, world)).not.toBe(p2Realization);
    });

    it('targeted invalidation does not affect unrelated other-plane entries', () => {
      const pH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(1, 1, 1));
      const pV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(2, 2, 1));

      const firstH = world.realizePoint2D(pH, world);
      const firstV = world.realizePoint2D(pV, world);

      world.invalidateRealization(pH.id);

      expect(world.realizePoint2D(pH, world)).not.toBe(firstH);
      expect(world.realizePoint2D(pV, world)).toBe(firstV);
    });
  });
});
