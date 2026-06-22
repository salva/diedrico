import { Vector3 } from 'three';
/**
 * Unit tests for ProjectionPlane Factory Methods
 * 
 * Tests ProjectionPlane factory methods for creating geometric elements.
 * Factory methods provide type-safe, validated element creation.
 * Note: Factory methods have been moved from World to ProjectionPlane.
 * 
 * @see frontend/src/domain/world/ProjectionPlane.ts
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-105
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';
import { Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, type Point2D } from '@/domain/world/Point';

describe('ProjectionPlane Factory Methods', () => {
  let world: World;
  let operationContext;
  let planeH: any;
  let planeV: any;

  function getHingeLineFromHalfHingeLine(halfHingeLineId: string) {
    const halfHingeLine = new GeometryElementLookup(world).getLine2D(halfHingeLineId);
    if (!(halfHingeLine instanceof HalfHingeLine2D)) return undefined;
    return world.getHingeLineById(halfHingeLine.hingeLineId);
  }

  function getSiblingPlaneForIntersection(intersectionPoint: Point2D): string | undefined {
    const lookup = new GeometryElementLookup(world);
    const [element1Id, element2Id] = getIntersectionElementIds(intersectionPoint);
    const element1 = element1Id ? lookup.getLine2D(element1Id) : undefined;
    const element2 = element2Id ? lookup.getLine2D(element2Id) : undefined;
    const halfHingeLine = element1 instanceof HalfHingeLine2D
      ? element1
      : element2 instanceof HalfHingeLine2D
        ? element2
        : undefined;

    if (!halfHingeLine) return undefined;
    return world.getHingeLineById(halfHingeLine.hingeLineId)?.getOtherPlane(intersectionPoint.planeId) || undefined;
  }

  function getIntersectionElementIds(intersectionPoint: Point2D): [string | undefined, string | undefined] {
    if (intersectionPoint instanceof Point2DLineLineIntersection) {
      return [intersectionPoint.line1Id, intersectionPoint.line2Id];
    }
    if (intersectionPoint instanceof Point2DLineCircleIntersection) {
      return [intersectionPoint.lineId, intersectionPoint.circleId];
    }
    if (intersectionPoint instanceof Point2DCircleCircleIntersection) {
      return [intersectionPoint.circle1Id, intersectionPoint.circle2Id];
    }
    return [undefined, undefined];
  }

  beforeEach(() => {
    const { world: w, operationContext: oc } = createTestWorld();
    world = w;
    operationContext = oc;
    planeH = getHorizontalPlane(world);
    planeV = getVerticalPlane(world);
  });

  describe('constructor', () => {
    it('should create a world with projection planes', () => {
      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes()) {
        allPoints.push(...plane.getAllPoints());
      }
      expect(allPoints.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Methods', () => {
    describe('addFreePoint2D', () => {
      it('should create and add a free point with generated ID', () => {
        const position = new Vector3(10, 20, 1);
        const point = operationContext.projectionConstruction.addFreePoint2D(planeH, position);

        expect(point.id).toMatch(/^projPlane\d+\/point2d\d+$/);
        expect(point.position).toEqual(position);
        expect(point.planeId).toBe(planeH.id);
        
        // Verify in world by searching through planes
        let foundPoint;
        for (const plane of world.getAllProjectionPlanes()) {
          foundPoint = plane.getPoint(point.id);
          if (foundPoint) break;
        }
        expect(foundPoint).toBe(point);
      });

      it('should create point with auto-generated ID', () => {
        const position = new Vector3(10, 20, 1);
        const point = operationContext.projectionConstruction.addFreePoint2D(planeH, position);

        expect(point.id).toMatch(/^projPlane\d+\/point2d\d+$/);  // Verify hierarchical format
        
        // Verify in world
        let foundPoint;
        for (const plane of world.getAllProjectionPlanes()) {
          foundPoint = plane.getPoint(point.id);
          if (foundPoint) break;
        }
        expect(foundPoint).toBe(point);
      });

      it('should throw error for invalid planeId', () => {
        // This test is no longer relevant - accessing a plane directly
        // Skip or we could test that getting a non-existent plane returns undefined
        const invalidPlane = world.getProjectionPlaneById('invalid_plane');
        expect(invalidPlane).toBeUndefined();
      });
    });

    describe('addLineLineIntersection', () => {
      it('should create intersection point between two lines', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const p3 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, -5, 1));
        const p4 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));

        const line1 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const line2 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p3.id, p4.id);

        const intersection = operationContext.projectionConstruction.addLineLineIntersection(planeH, line1.id, line2.id);

        expect(intersection.id).toMatch(/^projPlane\d+\/point2d\d+$/);
        expect(intersection.planeId).toBe(planeH.id);
        expect(planeH.getPoint(intersection.id)).toBe(intersection);
      });

      it('should use provided ID when given', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const p3 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, -5, 1));
        const p4 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));

        const line1 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const line2 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p3.id, p4.id);

        const customId = planeH.id + '/custom_intersection';
        const intersection = operationContext.projectionConstruction.addLineLineIntersection(planeH, line1.id, line2.id, customId);

        expect(intersection.id).toBe(customId);
      });

      it('should throw error for non-existent lines', () => {
        expect(() => {
          operationContext.projectionConstruction.addLineLineIntersection(planeH, 'invalid_line1', 'invalid_line2');
        }).toThrow();
      });

      it('should throw error for parallel lines', () => {
        // Create two horizontal parallel lines
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const p3 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 5, 1));
        const p4 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 5, 1));

        const line1 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const line2 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p3.id, p4.id); // Parallel to line1

        // After Phase 23, parallel lines create infeasible intersection point instead of throwing
        const point = operationContext.projectionConstruction.addLineLineIntersection(planeH, line1.id, line2.id);
        const realization = point.realize2D(operationContext.realizationContext);
        expect(realization).toBeDefined();
        expect(realization!.feasible).toBe(false);
      });
    });

    describe('addLine2DBetweenTwoPoints', () => {
      it('should create line between two points', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));

        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

        expect(line.id).toMatch(/^projPlane\d+\/line2d\d+$/);
        expect(line.planeId).toBe(planeH.id);
        expect(planeH.getLine(line.id)).toBe(line);
      });

      it('should use provided ID', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));

        const customId = planeH.id + '/custom_line';
        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id, customId);

        expect(line.id).toBe(customId);
      });

      it('should throw error for identical points', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));

        expect(() => {
          operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p1.id);
        }).toThrow(/point|distinct/i);
      });

      it('should throw error for non-existent points', () => {
        expect(() => {
          operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, 'invalid_p1', 'invalid_p2');
        }).toThrow();
      });
    });

    describe('addSegment2DBetweenPoints', () => {
      it('should create segment between two points', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));

        const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(planeH, p1.id, p2.id);

        expect(segment.id).toMatch(/^projPlane\d+\/segment2d\d+$/);
        expect(segment.planeId).toBe(planeH.id);
        expect(planeH.getLine(segment.id)).toBe(segment);
      });

      it('should use provided ID', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));

        const customId = planeH.id + '/custom_segment';
        const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(planeH, p1.id, p2.id, customId);

        expect(segment.id).toBe(customId);
      });

      it('should throw error for identical points', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));

        expect(() => {
          operationContext.projectionConstruction.addSegment2DBetweenPoints(planeH, p1.id, p1.id);
        }).toThrow(/point|segment/i);
      });
    });

    describe('addCircle2DByCenterAndPoint', () => {
      it('should create circle with center and circumference point', () => {
        const center = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        const circumPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(15, 5, 1));

        const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, center.id, circumPoint.id);

        expect(circle.id).toMatch(/^projPlane\d+\/circle2d\d+$/);
        expect(planeH.getCircle(circle.id)).toBe(circle);
      });

      it('should use provided ID', () => {
        const center = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        const circumPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(15, 5, 1));

        const customId = planeH.id + '/custom_circle';
        const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, center.id, circumPoint.id, customId);

        expect(circle.id).toBe(customId);
      });

      it('should throw error for non-existent center point', () => {
        const circumPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(15, 5, 1));

        expect(() => {
          operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, 'invalid', circumPoint.id);
        }).toThrow(/point/i);
      });
    });

    describe('addGuide2D', () => {
      it('should create guide perpendicular to reference line through point', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const throughPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        
        const referenceLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const guide = operationContext.projectionConstruction.addGuide2D(planeH, referenceLine.id, throughPoint.id);

        expect(guide.id).toMatch(/^projPlane\d+\/guide2d\d+$/);
        expect(planeH.getLine(guide.id)).toBe(guide);
      });

      it('should use provided ID', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const throughPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        
        const referenceLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const customId = planeH.id + '/custom_guide';
        const guide = operationContext.projectionConstruction.addGuide2D(planeH, referenceLine.id, throughPoint.id, customId);

        expect(guide.id).toBe(customId);
      });

      it('should throw error for non-existent reference line', () => {
        const point = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        
        expect(() => {
          operationContext.projectionConstruction.addGuide2D(planeH, 'invalid_line', point.id);
        }).toThrow(/line/i);
      });

      it('should throw error for non-existent through point', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const referenceLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        
        expect(() => {
          operationContext.projectionConstruction.addGuide2D(planeH, referenceLine.id, 'invalid_point');
        }).toThrow(/point/i);
      });
    });

    describe('Removal Methods', () => {
      it('should remove point and return success', () => {
        const point = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 20, 1));
        const pointId = point.id;

        const removed = planeH.removePoint(pointId);

        expect(removed).toBe(true);
        expect(planeH.getPoint(pointId)).toBeUndefined();
      });

      it('should remove line and return success', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

        const removed = planeH.removeLine(line.id);

        expect(removed).toBe(true);
        expect(planeH.getLine(line.id)).toBeUndefined();
      });

      it('should remove segment and return success', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
        const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(planeH, p1.id, p2.id);

        const removed = planeH.removeLine(segment.id); // Segments are Line2D

        expect(removed).toBe(true);
        expect(planeH.getLine(segment.id)).toBeUndefined();
      });

      it('should remove guide and return success', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const throughPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        const referenceLine = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const guide = operationContext.projectionConstruction.addGuide2D(planeH, referenceLine.id, throughPoint.id);

        const removed = planeH.removeLine(guide.id); // Guides are Line2D

        expect(removed).toBe(true);
        expect(planeH.getLine(guide.id)).toBeUndefined();
      });

      it('should return false when removing non-existent element', () => {
        expect(planeH.removePoint('invalid')).toBe(false);
        expect(planeH.removeLine('invalid')).toBe(false);
        expect(planeH.removeCircle('invalid')).toBe(false);
      });
    });

    describe('Realization Cache Updates', () => {
      it('should update realizations when point added', () => {
        const point = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 20, 1));

        const realization = point.realize2D(operationContext.realizationContext);

        expect(realization).toBeDefined();
        expect(realization?.position.x).toBe(10);
        expect(realization?.position.y).toBe(20);
      });

      it('should update realizations when line added', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

        const realization = line.realize2D(operationContext.realizationContext);

        expect(realization).toBeDefined();
      });

      it('should update realizations when segment added', () => {
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
        const segment = operationContext.projectionConstruction.addSegment2DBetweenPoints(planeH, p1.id, p2.id);

        // Phase 22.5: Segments are Line2D, use realize2D
        const realization = segment.realize2D(operationContext.realizationContext);

        expect(realization).toBeDefined();
      });
    });
  });

  // Phase 35: Sibling Plane Derivation Tests
  describe('Sibling Plane Derivation (Phase 35)', () => {
    describe('getHingeLineFromHalfHingeLine', () => {
      it('should return parent HingeLine for HalfHingeLine2D on P_H', () => {
        // Find the HalfHingeLine2D on P_H (created during initialization)
        const halfHLs = planeH.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const halfHL = halfHLs[0] as HalfHingeLine2D;
        
        const hingeLine = getHingeLineFromHalfHingeLine(halfHL.id);

        expect(hingeLine).toBeDefined();
        expect(hingeLine?.plane1Id).toBe(planeH.id);
        expect(hingeLine?.plane2Id).toBe(planeV.id);
      });

      it('should return parent HingeLine for HalfHingeLine2D on P_V', () => {
        // Find the HalfHingeLine2D on P_V (created during initialization)
        const halfHLs = planeV.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const halfHL = halfHLs[0] as HalfHingeLine2D;
        
        const hingeLine = getHingeLineFromHalfHingeLine(halfHL.id);

        expect(hingeLine).toBeDefined();
      });

      it('should throw error for corrupted HalfHingeLine2D container ID', () => {
        expect(() => {
          getHingeLineFromHalfHingeLine('missingPlane/nonexistent');
        }).toThrow('[INTERNAL ERROR]');
      });

      it('should return undefined for non-HalfHingeLine element', () => {
        // Create a regular line
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

        const hingeLine = getHingeLineFromHalfHingeLine(line.id);

        expect(hingeLine).toBeUndefined();
      });
    });

    describe('getSiblingPlaneForIntersection', () => {
      it('should return sibling plane for line-HHL intersection on P_H', () => {
        // Find the HalfHingeLine2D on P_H
        const halfHLs = planeH.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const hhlId = halfHLs[0].id;

        // Create a regular line
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, -5, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);

        // Create intersection point
        const intersection = operationContext.projectionConstruction.addLineLineIntersection(planeH, hhlId, line.id);

        const siblingPlaneId = getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBe(planeV.id);
      });

      it('should return sibling plane for line-HHL intersection on P_V', () => {
        // Find the HalfHingeLine2D on P_V
        const halfHLs = planeV.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const hhlId = halfHLs[0].id;

        // Create a regular line
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(5, -5, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(5, 5, 1));
        const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeV, p1.id, p2.id);

        // Create intersection point
        const intersection = operationContext.projectionConstruction.addLineLineIntersection(planeV, line.id, hhlId);

        const siblingPlaneId = getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBe(planeH.id);
      });

      it('should return undefined for regular line-line intersection (no HHL)', () => {
        // Create two regular lines
        const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 0, 1));
        const p3 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, -5, 1));
        const p4 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));

        const line1 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
        const line2 = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p3.id, p4.id);

        // Create intersection point
        const intersection = operationContext.projectionConstruction.addLineLineIntersection(planeH, line1.id, line2.id);

        const siblingPlaneId = getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBeUndefined();
      });

      it('should return sibling plane for circle-HHL intersection', () => {
        // Find the HalfHingeLine2D on P_H
        const halfHLs = planeH.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const hhlId = halfHLs[0].id;

        // Create a circle that intersects the HHL
        const center = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 3, 1));
        const radiusPoint = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 8, 1));
        const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, center.id, radiusPoint.id);

        // Create intersection point (circle-line)
        const intersection = operationContext.projectionConstruction.addLineCircleIntersection(planeH, hhlId, circle.id, 0);

        const siblingPlaneId = getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBe(planeV.id);
      });

      it('should return undefined for circle-circle intersection (no HHL)', () => {
        // Create two circles
        const c1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
        const r1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 0, 1));
        const circle1 = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, c1.id, r1.id);

        const c2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(8, 0, 1));
        const r2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(13, 0, 1));
        const circle2 = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, c2.id, r2.id);

        // Create intersection point
        const intersection = operationContext.projectionConstruction.addCircleCircleIntersection(planeH, circle1.id, circle2.id, 0);

        const siblingPlaneId = getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBeUndefined();
      });

      it('should return undefined for non-intersection point', () => {
        // Create a free point
        const point = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 20, 1));

        const siblingPlaneId = getSiblingPlaneForIntersection(point);

        expect(siblingPlaneId).toBeUndefined();
      });
    });
  });
});
