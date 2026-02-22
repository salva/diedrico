/**
 * Unit tests for degenerate point handling in realize2D methods
 * Phase 111: Verify that coincident/degenerate parent points produce infeasible realizations
 * 
 * Tasks: T1858-T1862
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Degenerate Point Handling in realize2D', () => {
  describe('Line2DByTwoPoints', () => {
    it('should throw when creating line from coincident points', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(5, 5, 1), world);

      expect(() => {
        plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      }).toThrow();
    });

    it('should return infeasible when points are nearly coincident but pass factory check', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      // Points 1e-7 apart: distance = ~1.4e-7, above 1e-10 factory threshold
      // But direction lengthSq = ~2e-14, below 1e-10 realize2D threshold
      const p1 = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(5 + 1e-7, 5 + 1e-7, 1), world);

      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const realization = line.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when points are sufficiently separated', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(1, 0, 1), world);

      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const realization = line.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
    });
  });

  describe('Line2DParallel', () => {
    it('should return infeasible when reference line is infeasible', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;

      // Create a nearly degenerate reference line (close points pass factory, fail realize2D)
      const p1 = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(5 + 1e-7, 5 + 1e-7, 1), world);
      const refLine = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

      // Confirm reference line is infeasible
      expect(refLine.realize2D(world)!.feasible).toBe(false);

      // Create a point for the parallel line to pass through
      const throughPoint = plane.addFreePoint2D(new Vector3(10, 10, 1), world);

      // Parallel line through throughPoint parallel to degenerate line
      const parallelLine = plane.addLine2DParallelToLine(refLine.id, throughPoint.id, world);
      const realization = parallelLine.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when reference line and through-point are valid', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;

      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      const refLine = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

      const throughPoint = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const parallelLine = plane.addLine2DParallelToLine(refLine.id, throughPoint.id, world);
      const realization = parallelLine.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
      // Direction should be parallel to reference line (horizontal)
      expect(realization!.point2.y).toBeCloseTo(0, 5);
      expect(Math.abs(realization!.point2.x)).toBeGreaterThan(0.1);
    });

    it('should return infeasible when through-point is infeasible', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;

      // Create valid reference line
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      const refLine = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

      // Create two parallel lines that won't intersect (same direction, different offsets)
      const p3 = plane.addFreePoint2D(new Vector3(0, 5, 1), world);
      const p4 = plane.addFreePoint2D(new Vector3(10, 5, 1), world);
      const line2 = plane.addLine2DBetweenTwoPoints(p3.id, p4.id, world);

      // Intersection of two parallel lines = infeasible point
      const infeasiblePoint = plane.addLineLineIntersection(refLine.id, line2.id, world);
      const pointRealization = infeasiblePoint.realize2D(world);
      expect(pointRealization!.feasible).toBe(false);

      // Parallel line through an infeasible point should also be infeasible
      const parallelLine = plane.addLine2DParallelToLine(refLine.id, infeasiblePoint.id, world);
      const realization = parallelLine.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Segment2DByPoints', () => {
    it('should return infeasible when endpoints are coincident', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(5, 5, 1), world);

      const segment = plane.addSegment2DBetweenPoints(p1.id, p2.id, world);
      const realization = segment.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when endpoints are separated', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(10, 5, 1), world);

      const segment = plane.addSegment2DBetweenPoints(p1.id, p2.id, world);
      const realization = segment.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
    });
  });

  describe('Circle2D', () => {
    it('should return infeasible when center and circumference point coincide', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      const center = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const circPt = plane.addFreePoint2D(new Vector3(5, 5, 1), world);

      const circle = plane.addCircle2DByCenterAndPoint(center.id, circPt.id, world);
      const realization = circle.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when center and circumference point are separated', () => {
      const { world } = createTestWorld();
      const plane = world.getProjectionPlaneByLabel('P_H')!;
      const center = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const circPt = plane.addFreePoint2D(new Vector3(10, 5, 1), world);

      const circle = plane.addCircle2DByCenterAndPoint(center.id, circPt.id, world);
      const realization = circle.realize2D(world);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
      expect(realization!.getRadius()).toBeCloseTo(5, 5);
    });
  });
});
