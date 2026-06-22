/**
 * Unit tests for degenerate point handling in realize2D methods
 * Phase 111: Verify that coincident/degenerate parent points produce infeasible realizations
 * 
 * Tasks: T1858-T1862
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';

describe('Degenerate Point Handling in realize2D', () => {
  describe('Line2DByTwoPoints', () => {
    it('should throw when creating line from coincident points', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));

      expect(() => {
        operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
      }).toThrow();
    });

    it('should return infeasible when points are nearly coincident but pass factory check', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      // Points 1e-7 apart: distance = ~1.4e-7, above 1e-10 factory threshold
      // But direction lengthSq = ~2e-14, below 1e-10 realize2D threshold
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5 + 1e-7, 5 + 1e-7, 1));

      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
      const realization = line.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when points are sufficiently separated', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(1, 0, 1));

      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
      const realization = line.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
    });
  });

  describe('Line2DParallel', () => {
    it('should return infeasible when reference line is infeasible', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);

      // Create a nearly degenerate reference line (close points pass factory, fail realize2D)
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5 + 1e-7, 5 + 1e-7, 1));
      const refLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Confirm reference line is infeasible
      expect(refLine.realize2D(operationContext.realizationContext)!.feasible).toBe(false);

      // Create a point for the parallel line to pass through
      const throughPoint = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 10, 1));

      // Parallel line through throughPoint parallel to degenerate line
      const parallelLine = operationContext.projectionConstruction.addLine2DParallelToLine(plane, refLine.id, throughPoint.id);
      const realization = parallelLine.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when reference line and through-point are valid', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);

      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
      const refLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      const throughPoint = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const parallelLine = operationContext.projectionConstruction.addLine2DParallelToLine(plane, refLine.id, throughPoint.id);
      const realization = parallelLine.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
      // Direction should be parallel to reference line (horizontal)
      expect(realization!.point2.y).toBeCloseTo(0, 5);
      expect(Math.abs(realization!.point2.x)).toBeGreaterThan(0.1);
    });

    it('should return infeasible when through-point is infeasible', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);

      // Create valid reference line
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
      const refLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Create two parallel lines that won't intersect (same direction, different offsets)
      const p3 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 5, 1));
      const p4 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 5, 1));
      const line2 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p3.id, p4.id);

      // Intersection of two parallel lines = infeasible point
      const infeasiblePoint = operationContext.projectionConstruction.addLineLineIntersection(plane, refLine.id, line2.id);
      const pointRealization = infeasiblePoint.realize2D(operationContext.realizationContext);
      expect(pointRealization!.feasible).toBe(false);

      // Parallel line through an infeasible point should also be infeasible
      const parallelLine = operationContext.projectionConstruction.addLine2DParallelToLine(plane, refLine.id, infeasiblePoint.id);
      const realization = parallelLine.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Segment2D', () => {
    it('should return infeasible when endpoints are coincident', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));

      const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(plane, p1.id, p2.id);
      const realization = segment.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when endpoints are separated', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 5, 1));

      const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(plane, p1.id, p2.id);
      const realization = segment.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
    });
  });

  describe('Circle2D', () => {
    it('should return infeasible when center and circumference point coincide', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      const center = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const circPt = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));

      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, center.id, circPt.id);
      const realization = circle.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(false);
    });

    it('should return feasible when center and circumference point are separated', () => {
      const { world, operationContext } = createTestWorld();
      const plane = getHorizontalPlane(world);
      const center = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const circPt = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 5, 1));

      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, center.id, circPt.id);
      const realization = circle.realize2D(operationContext.realizationContext);

      expect(realization).not.toBeNull();
      expect(realization!.feasible).toBe(true);
      expect(realization!.getRadius()).toBeCloseTo(5, 5);
    });
  });
});
