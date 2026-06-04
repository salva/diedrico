/**
 * Comprehensive tests for intersections with segments
 * Phase 112: Segment intersection correctness + index fallback
 * 
 * Covers:
 * - Line-line intersection (feasible + parallel)
 * - Line-segment intersection (in bounds + out of bounds)
 * - Segment-segment intersection (both/one/none in bounds)
 * - Line-circle intersection (both indices + tangent + no intersection)
 * - Segment-circle intersection (in bounds + out of bounds)
 * - Circle-circle intersection (two + tangent + none)
 * - Index fallback behavior
 * - Parent infeasibility propagation
 * 
 * Tasks: T1863-T1868
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Intersection Correctness', () => {
  // Helper: create world + plane
  function setup() {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    return { world, plane };
  }

  describe('Line-Line Intersection', () => {
    it('should return feasible intersection of two crossing lines', () => {
      const { world, plane } = setup();

      // Horizontal line through (0,0)-(10,0)
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const line1 = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Vertical line through (5,-5)-(5,5)
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, -5, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 5, 1));
      const line2 = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, line1.id, line2.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(true);
      expect(r.position.x).toBeCloseTo(5, 5);
      expect(r.position.y).toBeCloseTo(0, 5);
    });

    it('should return infeasible for parallel lines', () => {
      const { world, plane } = setup();

      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const line1 = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 5, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 5, 1));
      const line2 = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, line1.id, line2.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(false);
    });
  });

  describe('Line-Segment Intersection', () => {
    it('should return feasible when intersection is within segment bounds', () => {
      const { world, plane } = setup();

      // Infinite diagonal line
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 10, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Horizontal segment from (2, 5) to (8, 5)
      const s1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(2, 5, 1));
      const s2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 5, 1));
      const segment = world.getConstructionService().addSegment2DBetweenPoints(plane, s1.id, s2.id);

      // Line y=x intersects segment y=5 at x=5 → (5,5) which is within [2,8]
      const intersection = world.getConstructionService().addLineLineIntersection(plane, line.id, segment.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(true);
      expect(r.position.x).toBeCloseTo(5, 3);
      expect(r.position.y).toBeCloseTo(5, 3);
    });

    it('should return infeasible when intersection is outside segment bounds', () => {
      const { world, plane } = setup();

      // Steep line through origin: y = 3x
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(1, 3, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Horizontal segment from (2, 5) to (4, 5) — extends from x=2 to x=4
      const s1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(2, 5, 1));
      const s2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(4, 5, 1));
      const segment = world.getConstructionService().addSegment2DBetweenPoints(plane, s1.id, s2.id);

      // y=3x intersects y=5 at x=5/3 ≈ 1.67, which is OUTSIDE segment [2,4]
      const intersection = world.getConstructionService().addLineLineIntersection(plane, line.id, segment.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(false);
      // The position should still be computed (the actual intersection point)
      expect(r.position.x).toBeCloseTo(5 / 3, 2);
      expect(r.position.y).toBeCloseTo(5, 2);
    });
  });

  describe('Segment-Segment Intersection', () => {
    it('should return feasible when intersection is inside both segments', () => {
      const { world, plane } = setup();

      // Segment from (0,0) to (10,10)
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 10, 1));
      const seg1 = world.getConstructionService().addSegment2DBetweenPoints(plane, p1.id, p2.id);

      // Segment from (0,10) to (10,0) — crosses at (5,5)
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 10, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const seg2 = world.getConstructionService().addSegment2DBetweenPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, seg1.id, seg2.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(true);
      expect(r.position.x).toBeCloseTo(5, 3);
      expect(r.position.y).toBeCloseTo(5, 3);
    });

    it('should return infeasible when intersection is outside one segment', () => {
      const { world, plane } = setup();

      // Short segment from (0,0) to (3,3)
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(3, 3, 1));
      const seg1 = world.getConstructionService().addSegment2DBetweenPoints(plane, p1.id, p2.id);

      // Segment from (0,10) to (10,0) — would intersect diagonal at (5,5), outside seg1 [0,3]
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 10, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const seg2 = world.getConstructionService().addSegment2DBetweenPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, seg1.id, seg2.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(false);
    });

    it('should return infeasible when intersection is outside both segments', () => {
      const { world, plane } = setup();

      // Short segment from (0,0) to (2,2)
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(2, 2, 1));
      const seg1 = world.getConstructionService().addSegment2DBetweenPoints(plane, p1.id, p2.id);

      // Short segment from (8,10) to (10,8) — extension would cross seg1's extension at (5,5)
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 10, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 8, 1));
      const seg2 = world.getConstructionService().addSegment2DBetweenPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, seg1.id, seg2.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(false);
    });

    it('should return feasible when intersection is at segment endpoint', () => {
      const { world, plane } = setup();

      // Segment from (0,0) to (5,5)
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 5, 1));
      const seg1 = world.getConstructionService().addSegment2DBetweenPoints(plane, p1.id, p2.id);

      // Segment from (5,0) to (5,10) — crosses first segment at endpoint (5,5)
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 10, 1));
      const seg2 = world.getConstructionService().addSegment2DBetweenPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, seg1.id, seg2.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(true);
      expect(r.position.x).toBeCloseTo(5, 3);
      expect(r.position.y).toBeCloseTo(5, 3);
    });
  });

  describe('Line-Circle Intersection', () => {
    it('should return two feasible intersection points', () => {
      const { world, plane } = setup();

      // Horizontal line through y=0
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Circle centered at (5,0) with radius 3
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      const int0 = world.getConstructionService().addLineCircleIntersection(plane, line.id, circle.id, 0);
      const int1 = world.getConstructionService().addLineCircleIntersection(plane, line.id, circle.id, 1);
      const r0 = int0.realize2D(world);
      const r1 = int1.realize2D(world);

      expect(r0.feasible).toBe(true);
      expect(r1.feasible).toBe(true);

      // Intersections at x=2 and x=8 (or vice versa)
      const xs = [r0.position.x, r1.position.x].sort((a, b) => a - b);
      expect(xs[0]).toBeCloseTo(2, 2);
      expect(xs[1]).toBeCloseTo(8, 2);
    });

    it('should return infeasible when line does not intersect circle', () => {
      const { world, plane } = setup();

      // Line at y=10
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 10, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 10, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Circle centered at (5,0) with radius 3
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      const int0 = world.getConstructionService().addLineCircleIntersection(plane, line.id, circle.id, 0);
      const r0 = int0.realize2D(world);

      expect(r0.feasible).toBe(false);
    });

    it('should fallback index=1 to index=0 for tangent line', () => {
      const { world, plane } = setup();

      // Circle centered at (5,0) with radius 5
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      // Tangent line y=5 (tangent at (5,5))
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 5, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 5, 1));
      const tangent = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      const int0 = world.getConstructionService().addLineCircleIntersection(plane, tangent.id, circle.id, 0);
      const int1 = world.getConstructionService().addLineCircleIntersection(plane, tangent.id, circle.id, 1);
      const r0 = int0.realize2D(world);
      const r1 = int1.realize2D(world);

      // Both should return the same tangent point
      expect(r0.feasible).toBe(true);
      expect(r1.feasible).toBe(true);
      expect(r0.position.x).toBeCloseTo(r1.position.x, 2);
      expect(r0.position.y).toBeCloseTo(r1.position.y, 2);
    });
  });

  describe('Segment-Circle Intersection', () => {
    it('should return feasible when intersection is within segment bounds', () => {
      const { world, plane } = setup();

      // Segment from (0,0) to (10,0) — horizontal, passes through circle
      const s1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const s2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const segment = world.getConstructionService().addSegment2DBetweenPoints(plane, s1.id, s2.id);

      // Circle centered at (5,0) with radius 3
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      // Both intersections at x=2 and x=8 are within segment [0,10]
      const int0 = world.getConstructionService().addLineCircleIntersection(plane, segment.id, circle.id, 0);
      const r0 = int0.realize2D(world);

      expect(r0.feasible).toBe(true);
    });

    it('should return infeasible when intersection is outside segment bounds', () => {
      const { world, plane } = setup();

      // Short segment from (0,0) to (1,0) — far from circle intersection
      const s1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const s2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(1, 0, 1));
      const segment = world.getConstructionService().addSegment2DBetweenPoints(plane, s1.id, s2.id);

      // Circle centered at (5,0) with radius 3 — intersections at x=2 and x=8
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      const int0 = world.getConstructionService().addLineCircleIntersection(plane, segment.id, circle.id, 0);
      const r0 = int0.realize2D(world);

      expect(r0.feasible).toBe(false);
    });

    it('should handle segment partially intersecting circle', () => {
      const { world, plane } = setup();

      // Segment from (0,0) to (5,0) — one intersection in bounds, one outside
      const s1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const s2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const segment = world.getConstructionService().addSegment2DBetweenPoints(plane, s1.id, s2.id);

      // Circle centered at (5,0) with radius 3 — intersections at x=2 and x=8
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(8, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      const int0 = world.getConstructionService().addLineCircleIntersection(plane, segment.id, circle.id, 0);
      const int1 = world.getConstructionService().addLineCircleIntersection(plane, segment.id, circle.id, 1);
      const r0 = int0.realize2D(world);
      const r1 = int1.realize2D(world);

      // One should be feasible (x=2 inside [0,5]), one infeasible (x=8 outside [0,5])
      const feasibleCount = [r0, r1].filter(r => r.feasible).length;
      const infeasibleCount = [r0, r1].filter(r => !r.feasible).length;
      expect(feasibleCount).toBe(1);
      expect(infeasibleCount).toBe(1);
    });
  });

  describe('Circle-Circle Intersection', () => {
    it('should return two feasible intersections', () => {
      const { world, plane } = setup();

      // Circle 1 at (0,0) radius 5
      const c1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const c1p = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circle1 = world.getConstructionService().addCircle2DByCenterAndPoint(plane, c1.id, c1p.id);

      // Circle 2 at (6,0) radius 5
      const c2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(6, 0, 1));
      const c2p = world.getConstructionService().addFreePoint2D(plane, new Vector3(11, 0, 1));
      const circle2 = world.getConstructionService().addCircle2DByCenterAndPoint(plane, c2.id, c2p.id);

      const int0 = world.getConstructionService().addCircleCircleIntersection(plane, circle1.id, circle2.id, 0);
      const int1 = world.getConstructionService().addCircleCircleIntersection(plane, circle1.id, circle2.id, 1);
      const r0 = int0.realize2D(world);
      const r1 = int1.realize2D(world);

      expect(r0.feasible).toBe(true);
      expect(r1.feasible).toBe(true);

      // The two intersection points should be different
      const dist = r0.position.distanceTo(r1.position);
      expect(dist).toBeGreaterThan(0.1);

      // Both should lie on both circles (distance from center = radius)
      expect(r0.position.distanceTo(new Vector3(0, 0, 1))).toBeCloseTo(5, 2);
      expect(r0.position.distanceTo(new Vector3(6, 0, 1))).toBeCloseTo(5, 2);
    });

    it('should return infeasible when circles do not intersect', () => {
      const { world, plane } = setup();

      // Circle 1 at (0,0) radius 2
      const c1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const c1p = world.getConstructionService().addFreePoint2D(plane, new Vector3(2, 0, 1));
      const circle1 = world.getConstructionService().addCircle2DByCenterAndPoint(plane, c1.id, c1p.id);

      // Circle 2 at (10,0) radius 2 — too far apart
      const c2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const c2p = world.getConstructionService().addFreePoint2D(plane, new Vector3(12, 0, 1));
      const circle2 = world.getConstructionService().addCircle2DByCenterAndPoint(plane, c2.id, c2p.id);

      const int0 = world.getConstructionService().addCircleCircleIntersection(plane, circle1.id, circle2.id, 0);
      const r0 = int0.realize2D(world);

      expect(r0.feasible).toBe(false);
    });

    it('should fallback index=1 to index=0 for tangent circles', () => {
      const { world, plane } = setup();

      // Circle 1 at (0,0) radius 5
      const c1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const c1p = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circle1 = world.getConstructionService().addCircle2DByCenterAndPoint(plane, c1.id, c1p.id);

      // Circle 2 at (10,0) radius 5 — tangent at (5,0)
      const c2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const c2p = world.getConstructionService().addFreePoint2D(plane, new Vector3(15, 0, 1));
      const circle2 = world.getConstructionService().addCircle2DByCenterAndPoint(plane, c2.id, c2p.id);

      const int0 = world.getConstructionService().addCircleCircleIntersection(plane, circle1.id, circle2.id, 0);
      const int1 = world.getConstructionService().addCircleCircleIntersection(plane, circle1.id, circle2.id, 1);
      const r0 = int0.realize2D(world);
      const r1 = int1.realize2D(world);

      // Both should be feasible and close to (5,0) — tangent point
      expect(r0.feasible).toBe(true);
      expect(r1.feasible).toBe(true);
      expect(r0.position.x).toBeCloseTo(5, 1);
      expect(r0.position.y).toBeCloseTo(0, 1);
      expect(r0.position.distanceTo(r1.position)).toBeLessThan(0.1);
    });
  });

  describe('Parent Infeasibility Propagation', () => {
    it('should propagate infeasible line to line-line intersection', () => {
      const { world, plane } = setup();

      // Degenerate line (near-coincident points)
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 5, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5 + 1e-7, 5 + 1e-7, 1));
      const degLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Normal line
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 10, 1));
      const normalLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p3.id, p4.id);

      const intersection = world.getConstructionService().addLineLineIntersection(plane, degLine.id, normalLine.id);
      const r = intersection.realize2D(world);

      expect(r.feasible).toBe(false);
    });

    it('should propagate infeasible circle to line-circle intersection', () => {
      const { world, plane } = setup();

      // Normal line
      const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
      const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);

      // Degenerate circle (coincident center + circumference point → radius 0)
      const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circPt = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
      const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, circPt.id);

      const int0 = world.getConstructionService().addLineCircleIntersection(plane, line.id, circle.id, 0);
      const r0 = int0.realize2D(world);

      expect(r0.feasible).toBe(false);
    });
  });
});
