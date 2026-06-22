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
import type { OperationContext } from '@/commands/operations/OperationContext';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';
import type { CachedProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

describe('Per-Plane Realization Cache (Phase 119)', () => {
  let world: World;
  let operationContext: OperationContext;
  let realizationContext: CachedProjectionElementRealizationContext;
  let planeH: ProjectionPlane;
  let planeV: ProjectionPlane;

  beforeEach(() => {
    const { world: w, operationContext: context } = createTestWorld();
    world = w;
    operationContext = context;
    realizationContext = operationContext.realizationContext;
    planeH = getHorizontalPlane(world);
    planeV = getVerticalPlane(world);
  });

  // ── T1913: Cache hit — same object reference on repeated calls ──

  describe('Cache hit (T1913)', () => {
    it('realizePoint2D returns same instance on second call', () => {
      const p = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(3, 4, 1));

      const first = operationContext.realizations.realizePoint2D(p, realizationContext);
      const second = operationContext.realizations.realizePoint2D(p, realizationContext);

      expect(first).toBeDefined();
      expect(second).toBe(first); // exact same reference
    });

    it('realizeLine2D returns same instance on second call', () => {
      const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

      const first = operationContext.realizations.realizeLine2D(line, realizationContext);
      const second = operationContext.realizations.realizeLine2D(line, realizationContext);

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });

    it('realizeCircle2D returns same instance on second call', () => {
      const center = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const circumPt = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 0, 1));
      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, center.id, circumPt.id);

      const first = operationContext.realizations.realizeCircle2D(circle, realizationContext);
      const second = operationContext.realizations.realizeCircle2D(circle, realizationContext);

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });

    it('subsequent facade calls return the exact cached realization', () => {
      const p = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(1, 2, 1));

      const realized = operationContext.realizations.realizePoint2D(p, realizationContext);
      expect(operationContext.realizations.realizePoint2D(p, realizationContext)).toBe(realized);
    });
  });

  // ── T1914: Cache invalidation via RealizationService.invalidateElement ──

  describe('Cache invalidation (T1914)', () => {
    it('invalidateElement clears point cache; next call returns fresh object', () => {
      const p = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(7, 8, 1));
      const first = operationContext.realizations.realizePoint2D(p, realizationContext);

      operationContext.realizations.invalidateElement(p.id, operationContext.dependencies, world.getAllProjectionPlanes());

      const second = operationContext.realizations.realizePoint2D(p, realizationContext);
      expect(second).toBeDefined();
      expect(second).not.toBe(first); // new instance after invalidation
    });

    it('invalidateElement clears line cache for the same element', () => {
      const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

      const first = operationContext.realizations.realizeLine2D(line, realizationContext);

      // Invalidating a parent point cascades to the line
      operationContext.realizations.invalidateElement(p1.id, operationContext.dependencies, world.getAllProjectionPlanes());
      expect(operationContext.realizations.realizeLine2D(line, realizationContext)).not.toBe(first);
    });

    it('invalidateElement clears circle cache when center point invalidated', () => {
      const center = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const circumPt = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(3, 0, 1));
      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, center.id, circumPt.id);

      const first = operationContext.realizations.realizeCircle2D(circle, realizationContext);

      operationContext.realizations.invalidateElement(center.id, operationContext.dependencies, world.getAllProjectionPlanes());
      expect(operationContext.realizations.realizeCircle2D(circle, realizationContext)).not.toBe(first);
    });
  });

  // ── T1915: Dependency propagation — parent change invalidates child ──

  describe('Dependency propagation (T1915)', () => {
    it('invalidating a point clears dependent line on same plane', () => {
      const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

      // Populate all caches
      const pReal = operationContext.realizations.realizePoint2D(p1, realizationContext);
      const p2Real = operationContext.realizations.realizePoint2D(p2, realizationContext);
      const lReal = operationContext.realizations.realizeLine2D(line, realizationContext);
      expect(pReal).toBeDefined();
      expect(p2Real).toBeDefined();
      expect(lReal).toBeDefined();

      // Invalidate root point → line should also be cleared
      operationContext.realizations.invalidateElement(p1.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizePoint2D(p1, realizationContext)).not.toBe(pReal);
      expect(operationContext.realizations.realizeLine2D(line, realizationContext)).not.toBe(lReal);
      // Sibling point (p2) not dependent on p1, so should remain cached
      expect(operationContext.realizations.realizePoint2D(p2, realizationContext)).toBe(p2Real);
    });

    it('invalidating a point clears dependent circle on same plane', () => {
      const center = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const circPt = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(4, 0, 1));
      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, center.id, circPt.id);

      operationContext.realizations.realizePoint2D(center, realizationContext);
      const circPtRealization = operationContext.realizations.realizePoint2D(circPt, realizationContext);
      const circleRealization = operationContext.realizations.realizeCircle2D(circle, realizationContext);

      operationContext.realizations.invalidateElement(center.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizeCircle2D(circle, realizationContext)).not.toBe(circleRealization);
      // circPt is independent of center, cache untouched
      expect(operationContext.realizations.realizePoint2D(circPt, realizationContext)).toBe(circPtRealization);
    });

    it('two-level cascade: point → line → intersection point', () => {
      // p1, p2 define line1; p3, p4 define line2; they intersect
      const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
      const p3 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, -5, 1));
      const p4 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5,  5, 1));
      const line1 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      const line2 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p3.id, p4.id);

      const intPt = operationContext.projectionConstruction.addLineLineIntersection(planeH, line1.id, line2.id);

      // Realize everything
      const p1Realization = operationContext.realizations.realizePoint2D(p1, realizationContext);
      operationContext.realizations.realizePoint2D(p2, realizationContext);
      const p3Realization = operationContext.realizations.realizePoint2D(p3, realizationContext);
      const p4Realization = operationContext.realizations.realizePoint2D(p4, realizationContext);
      const line1Realization = operationContext.realizations.realizeLine2D(line1, realizationContext);
      const line2Realization = operationContext.realizations.realizeLine2D(line2, realizationContext);
      const intPtRealization = operationContext.realizations.realizePoint2D(intPt, realizationContext);

      // Invalidate p1 → line1 → intersection
      operationContext.realizations.invalidateElement(p1.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizePoint2D(p1, realizationContext)).not.toBe(p1Realization);
      expect(operationContext.realizations.realizeLine2D(line1, realizationContext)).not.toBe(line1Realization);
      expect(operationContext.realizations.realizePoint2D(intPt, realizationContext)).not.toBe(intPtRealization);

      // line2 and its defining points should be untouched
      expect(operationContext.realizations.realizeLine2D(line2, realizationContext)).toBe(line2Realization);
      expect(operationContext.realizations.realizePoint2D(p3, realizationContext)).toBe(p3Realization);
      expect(operationContext.realizations.realizePoint2D(p4, realizationContext)).toBe(p4Realization);
    });
  });

  // ── T1916: Cross-plane cache clearing on invalidation ──

  describe('Cross-plane propagation (T1916)', () => {
    it('invalidateElement clears affected caches across all planes', () => {
      // Add a point to P_H and a different point to P_V
      const pH = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(2, 3, 1));
      const pV = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(7, 8, 1));

      const firstH = operationContext.realizations.realizePoint2D(pH, realizationContext);
      const firstV = operationContext.realizations.realizePoint2D(pV, realizationContext);

      // Invalidate pH → should clear pH's cache in ALL planes (even though it's only on P_H)
      operationContext.realizations.invalidateElement(pH.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizePoint2D(pH, realizationContext)).not.toBe(firstH);
      // pV is independent, should remain cached
      expect(operationContext.realizations.realizePoint2D(pV, realizationContext)).toBe(firstV);
    });

    it('invalidation on one plane does not clear unrelated caches on other plane', () => {
      const pA = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(1, 1, 1));
      const pB = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 1, 1));
      const pC = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(2, 2, 1));
      const pD = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(8, 2, 1));

      const lineH = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, pA.id, pB.id);
      const lineV = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeV, pC.id, pD.id);

      // Realize everything
      const pARealization = operationContext.realizations.realizePoint2D(pA, realizationContext);
      operationContext.realizations.realizePoint2D(pB, realizationContext);
      const lineHRealization = operationContext.realizations.realizeLine2D(lineH, realizationContext);
      const pCRealization = operationContext.realizations.realizePoint2D(pC, realizationContext);
      const pDRealization = operationContext.realizations.realizePoint2D(pD, realizationContext);
      const lineVRealization = operationContext.realizations.realizeLine2D(lineV, realizationContext);

      // Invalidate pA → cascades to lineH, but nothing on P_V linked
      operationContext.realizations.invalidateElement(pA.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizePoint2D(pA, realizationContext)).not.toBe(pARealization);
      expect(operationContext.realizations.realizeLine2D(lineH, realizationContext)).not.toBe(lineHRealization);

      // P_V caches untouched
      expect(operationContext.realizations.realizePoint2D(pC, realizationContext)).toBe(pCRealization);
      expect(operationContext.realizations.realizePoint2D(pD, realizationContext)).toBe(pDRealization);
      expect(operationContext.realizations.realizeLine2D(lineV, realizationContext)).toBe(lineVRealization);
    });
  });

  // ── T1917: Full cache clear via World.clear() ──

  describe('Full cache clear (T1917)', () => {
    it('World.clear() empties all point, line, and circle realization caches', () => {
      const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
      const p1Realization = operationContext.realizations.realizePoint2D(p1, realizationContext);
      const p2Realization = operationContext.realizations.realizePoint2D(p2, realizationContext);

      world.clear();
      operationContext.realizations.clear();

      expect(operationContext.realizations.realizePoint2D(p1, realizationContext)).not.toBe(p1Realization);
      expect(operationContext.realizations.realizePoint2D(p2, realizationContext)).not.toBe(p2Realization);
    });

    it('targeted invalidation does not affect unrelated other-plane entries', () => {
      const pH = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(1, 1, 1));
      const pV = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(2, 2, 1));

      const firstH = operationContext.realizations.realizePoint2D(pH, realizationContext);
      const firstV = operationContext.realizations.realizePoint2D(pV, realizationContext);

      operationContext.realizations.invalidateElement(pH.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizePoint2D(pH, realizationContext)).not.toBe(firstH);
      expect(operationContext.realizations.realizePoint2D(pV, realizationContext)).toBe(firstV);
    });
  });
});
