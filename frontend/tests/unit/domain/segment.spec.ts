/**
 * Unit tests for Segment domain entities
 * 
 * Tests the Segment2D geometry classes:
 * - Segment2DByPoints: Defines segment by two point IDs
 * - Line2DRealization2D: Computed segment with endpoints in plane coordinates
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { Line2DRealization2D } from '@/domain/world/Line';
import { FreePoint2D, Point2DRealization2D } from '@/domain/world/Point';
import { World } from '@/domain/world/World';

describe('Segment2D', () => {
  let world: World;
  let planeH: any;
  let point1Id: string;
  let point2Id: string;

  beforeEach(() => {
    world = new World();
    planeH = world.getProjectionPlaneByLabel('P_H')!;
    
    // Create two test points using factory method (let IDs auto-generate)
    const point1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
    const point2 = planeH.addFreePoint2D(new Vector3(100, 50, 1), world);
    
    point1Id = point1.id;
    point2Id = point2.id;
  });

  describe('Segment2DByPoints', () => {
    it('should create segment with point references', () => {
      const segment = new Segment2DByPoints(planeH.id + '/seg1', point1Id, point2Id, planeH.id);
      
      expect(segment.id).toBe(planeH.id + '/seg1');
      expect(segment.type).toBe('segment');  // Phase 22.5: unified line type
      expect(segment.point1Id).toBe(point1Id);
      expect(segment.point2Id).toBe(point2Id);
      expect(segment.planeId).toBe(planeH.id);
    });

    it('should clone segment correctly', () => {
      const original = new Segment2DByPoints(planeH.id + '/seg1', point1Id, point2Id, planeH.id);
      const cloned = original.clone();
      
      expect(cloned.id).toBe(planeH.id + '/seg1');
      expect(cloned.point1Id).toBe(point1Id);
      expect(cloned.point2Id).toBe(point2Id);
      expect(cloned.planeId).toBe(planeH.id);
      expect(cloned).not.toBe(original);
    });

    it('should realize segment with valid points', () => {
      const segment = planeH.addSegment2DBetweenPoints(point1Id, point2Id, world);
      const realization = segment.realize2D(world);
      
      expect(realization).toBeDefined();
      expect(realization!.point1.x).toBe(0);
      expect(realization!.point1.y).toBe(0);
      expect(realization!.point2.x).toBe(100);
      expect(realization!.point2.y).toBe(50);
    });

    it('should return null when first point is missing', () => {
      const segment = new Segment2DByPoints(planeH.id + '/seg1', 'missing', point2Id, planeH.id);
      const realization = segment.realize2D(world);
      
      expect(realization).toBeNull();
    });

    it('should return null when second point is missing', () => {
      const segment = new Segment2DByPoints(planeH.id + '/seg1', point1Id, 'missing', planeH.id);
      const realization = segment.realize2D(world);
      
      expect(realization).toBeNull();
    });

    it('should return null when both points are missing', () => {
      const segment = new Segment2DByPoints(planeH.id + '/seg1', 'missing1', 'missing2', planeH.id);
      const realization = segment.realize2D(world);
      
      expect(realization).toBeNull();
    });

    it('should detect degenerate segment (coincident points)', () => {
      // Create two coincident points using factory method
      const point3 = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const point4 = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      
      const segment = new Segment2DByPoints(planeH.id + '/seg1', point3.id, point4.id, planeH.id);
      const realization = segment.realize2D(world);
      
      // Degenerate segments return infeasible realization
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Line2DRealization2D', () => {
    it('should compute segment length', () => {
      const realization = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(3, 4, 1)
      );
      
      // Length = sqrt(3^2 + 4^2) = 5
      expect(realization.getLength()).toBe(5);
    });

    it('should compute length for horizontal segment', () => {
      const realization = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(10, 0, 1)
      );
      
      expect(realization.getLength()).toBe(10);
    });

    it('should compute length for vertical segment', () => {
      const realization = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(0, 7, 1)
      );
      
      expect(realization.getLength()).toBe(7);
    });

    it('should compute length for diagonal segment', () => {
      const realization = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 1)
      );
      
      // Length = sqrt(2)
      expect(realization.getLength()).toBeCloseTo(Math.sqrt(2), 10);
    });

    it('should have zero length for degenerate segment', () => {
      const realization = new Line2DRealization2D(
        new Vector3(5, 5, 1),
        new Vector3(5, 5, 1)
      );
      
      expect(realization.getLength()).toBe(0);
    });

    it('should store endpoints correctly', () => {
      const point1 = new Vector3(10, 20, 1);
      const point2 = new Vector3(30, 40, 1);
      const realization = new Line2DRealization2D(point1, point2);
      
      expect(realization.point1.x).toBe(10);
      expect(realization.point1.y).toBe(20);
      expect(realization.point2.x).toBe(30);
      expect(realization.point2.y).toBe(40);
    });
  });

  describe('Segment2DPointToLine (Phase 74.1)', () => {
    it('should create perpendicular segment from point to horizontal line', () => {
      // Create horizontal line
      const lineP1 = planeH.addFreePoint2D(new Vector3(0, 50, 1), world);
      const lineP2 = planeH.addFreePoint2D(new Vector3(100, 50, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(lineP1.id, lineP2.id, world);
      
      // Create point above line
      const point = planeH.addFreePoint2D(new Vector3(50, 80, 1), world);
      
      // Create perpendicular segment
      const segment = planeH.addSegment2DPointToLine(point.id, line.id, world);
      const real = segment.realize2D(world);
      
      expect(real).toBeDefined();
      expect(real!.feasible).toBe(true);
      expect(real!.point1.x).toBeCloseTo(50, 1);
      expect(real!.point1.y).toBeCloseTo(80, 1);
      expect(real!.point2.x).toBeCloseTo(50, 1);
      expect(real!.point2.y).toBeCloseTo(50, 1); // Foot on line
    });

    it('should create perpendicular segment from point to vertical line', () => {
      const lineP1 = planeH.addFreePoint2D(new Vector3(40, 0, 1), world);
      const lineP2 = planeH.addFreePoint2D(new Vector3(40, 100, 1), world);
      const line = planeH.addLine2DBetweenTwoPoints(lineP1.id, lineP2.id, world);
      
      const point = planeH.addFreePoint2D(new Vector3(70, 50, 1), world);
      
      const segment = planeH.addSegment2DPointToLine(point.id, line.id, world);
      const real = segment.realize2D(world);
      
      expect(real!.feasible).toBe(true);
      expect(real!.point1.x).toBeCloseTo(70, 1);
      expect(real!.point2.x).toBeCloseTo(40, 1);
      expect(real!.point2.y).toBeCloseTo(50, 1);
    });
  });

  describe('Segment2DPointToCircleTangent (Phase 74.1)', () => {
    it('should create tangent segment from external point (index 0)', () => {
      const center = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const radiusPoint = planeH.addFreePoint2D(new Vector3(70, 50, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, radiusPoint.id, world);
      
      // Point to the right of circle (external)
      const point = planeH.addFreePoint2D(new Vector3(100, 50, 1), world);
      
      const segment = planeH.addSegment2DPointToCircleTangent(point.id, circle.id, 0, world);
      const real = segment.realize2D(world);
      
      expect(real).toBeDefined();
      expect(real!.feasible).toBe(true);
      
      // Segment starts at point
      expect(real!.point1.x).toBeCloseTo(100, 1);
      expect(real!.point1.y).toBeCloseTo(50, 1);
      
      // Segment ends at tangent touch point on circle
      const touchDist = Math.sqrt(
        Math.pow(real!.point2.x - 50, 2) + 
        Math.pow(real!.point2.y - 50, 2)
      );
      expect(touchDist).toBeCloseTo(20, 1); // Radius is 20
    });

    it('should create tangent segment with index 1 (other tangent)', () => {
      const center = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const radiusPoint = planeH.addFreePoint2D(new Vector3(70, 50, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, radiusPoint.id, world);
      
      const point = planeH.addFreePoint2D(new Vector3(100, 50, 1), world);
      
      const segment0 = planeH.addSegment2DPointToCircleTangent(point.id, circle.id, 0, world);
      const segment1 = planeH.addSegment2DPointToCircleTangent(point.id, circle.id, 1, world);
      
      const real0 = segment0.realize2D(world);
      const real1 = segment1.realize2D(world);
      
      expect(real0!.feasible).toBe(true);
      expect(real1!.feasible).toBe(true);
      
      // Touch points should be different
      expect(real0!.point2.y).not.toBeCloseTo(real1!.point2.y, 1);
    });

    it('should be infeasible if point is inside circle', () => {
      const center = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const radiusPoint = planeH.addFreePoint2D(new Vector3(80, 50, 1), world);
      const circle = planeH.addCircle2DByCenterAndPoint(center.id, radiusPoint.id, world);
      
      // Point inside circle
      const point = planeH.addFreePoint2D(new Vector3(55, 50, 1), world);
      
      const segment = planeH.addSegment2DPointToCircleTangent(point.id, circle.id, 0, world);
      const real = segment.realize2D(world);
      
      expect(real!.feasible).toBe(false);
    });
  });

  describe('Segment2DCircleToCircleExternal (Phase 74.1)', () => {
    it('should create external tangent segment (index 0)', () => {
      const c1center = planeH.addFreePoint2D(new Vector3(30, 50, 1), world);
      const c1radius = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const circle1 = planeH.addCircle2DByCenterAndPoint(c1center.id, c1radius.id, world);
      
      const c2center = planeH.addFreePoint2D(new Vector3(90, 50, 1), world);
      const c2radius = planeH.addFreePoint2D(new Vector3(110, 50, 1), world);
      const circle2 = planeH.addCircle2DByCenterAndPoint(c2center.id, c2radius.id, world);
      
      const segment = planeH.addSegment2DCircleToCircleExternal(circle1.id, circle2.id, 0, world);
      const real = segment.realize2D(world);
      
      expect(real).toBeDefined();
      expect(real!.feasible).toBe(true);
      
      // Both endpoints should be on their respective circles
      const dist1 = Math.sqrt(
        Math.pow(real!.point1.x - 30, 2) + 
        Math.pow(real!.point1.y - 50, 2)
      );
      expect(dist1).toBeCloseTo(20, 1);
      
      const dist2 = Math.sqrt(
        Math.pow(real!.point2.x - 90, 2) + 
        Math.pow(real!.point2.y - 50, 2)
      );
      expect(dist2).toBeCloseTo(20, 1);
    });

    it('should be infeasible if circles overlap', () => {
      const c1center = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const c1radius = planeH.addFreePoint2D(new Vector3(70, 50, 1), world);
      const circle1 = planeH.addCircle2DByCenterAndPoint(c1center.id, c1radius.id, world);
      
      const c2center = planeH.addFreePoint2D(new Vector3(60, 50, 1), world);
      const c2radius = planeH.addFreePoint2D(new Vector3(80, 50, 1), world);
      const circle2 = planeH.addCircle2DByCenterAndPoint(c2center.id, c2radius.id, world);
      
      const segment = planeH.addSegment2DCircleToCircleExternal(circle1.id, circle2.id, 0, world);
      const real = segment.realize2D(world);
      
      expect(real!.feasible).toBe(false);
    });
  });

  describe('Segment2DCircleToCircleInternal (Phase 74.1)', () => {
    it('should create internal tangent segment', () => {
      const c1center = planeH.addFreePoint2D(new Vector3(30, 50, 1), world);
      const c1radius = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const circle1 = planeH.addCircle2DByCenterAndPoint(c1center.id, c1radius.id, world);
      
      const c2center = planeH.addFreePoint2D(new Vector3(90, 50, 1), world);
      const c2radius = planeH.addFreePoint2D(new Vector3(110, 50, 1), world);
      const circle2 = planeH.addCircle2DByCenterAndPoint(c2center.id, c2radius.id, world);
      
      const segment = planeH.addSegment2DCircleToCircleInternal(circle1.id, circle2.id, 0, world);
      const real = segment.realize2D(world);
      
      expect(real).toBeDefined();
      expect(real!.feasible).toBe(true);
    });
  });

  describe('Segment2DCircleToCirclePerpendicular (Phase 74.1)', () => {
    it('should create perpendicular segment between circles', () => {
      const c1center = planeH.addFreePoint2D(new Vector3(30, 50, 1), world);
      const c1radius = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const circle1 = planeH.addCircle2DByCenterAndPoint(c1center.id, c1radius.id, world);
      
      const c2center = planeH.addFreePoint2D(new Vector3(90, 50, 1), world);
      const c2radius = planeH.addFreePoint2D(new Vector3(110, 50, 1), world);
      const circle2 = planeH.addCircle2DByCenterAndPoint(c2center.id, c2radius.id, world);
      
      const segment = planeH.addSegment2DCircleToCirclePerpendicular(circle1.id, circle2.id, world);
      const real = segment.realize2D(world);
      
      expect(real).toBeDefined();
      expect(real!.feasible).toBe(true);
      
      // Segment should be perpendicular to center line (horizontal in this case)
      // So segment should be vertical
      const dx = real!.point2.x - real!.point1.x;
      const dy = real!.point2.y - real!.point1.y;
      
      // Perpendicular to horizontal = vertical
      expect(Math.abs(dx)).toBeLessThan(0.1);
      expect(Math.abs(dy)).toBeGreaterThan(0);
    });
  });

  describe('Segment2DCircleToCircleThroughCenters (Phase 74.1)', () => {
    it('should create segment connecting circle centers', () => {
      const c1center = planeH.addFreePoint2D(new Vector3(30, 50, 1), world);
      const c1radius = planeH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const circle1 = planeH.addCircle2DByCenterAndPoint(c1center.id, c1radius.id, world);
      
      const c2center = planeH.addFreePoint2D(new Vector3(90, 70, 1), world);
      const c2radius = planeH.addFreePoint2D(new Vector3(110, 70, 1), world);
      const circle2 = planeH.addCircle2DByCenterAndPoint(c2center.id, c2radius.id, world);
      
      const segment = planeH.addSegment2DCircleToCircleThroughCenters(circle1.id, circle2.id, world);
      const real = segment.realize2D(world);
      
      expect(real).toBeDefined();
      expect(real!.feasible).toBe(true);
      
      // Segment endpoints should be at circle centers
      expect(real!.point1.x).toBeCloseTo(30, 1);
      expect(real!.point1.y).toBeCloseTo(50, 1);
      expect(real!.point2.x).toBeCloseTo(90, 1);
      expect(real!.point2.y).toBeCloseTo(70, 1);
    });
  });
});
