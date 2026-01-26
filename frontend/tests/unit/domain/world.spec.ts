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
import { World } from '@/domain/world/World';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { SiblingIntersectionPoint2D } from '@/domain/world/Point';

describe('ProjectionPlane Factory Methods', () => {
  let world: World;
  let planeH: any;
  let planeV: any;

  beforeEach(() => {
    world = new World();
    planeH = world.getProjectionPlaneByLabel('P_H')!;
    planeV = world.getProjectionPlaneByLabel('P_V')!;
  });

  describe('constructor', () => {
    it('should create a world with projection planes', () => {
      const allPoints: any[] = [];
      for (const plane of world.projectionPlanes.values()) {
        allPoints.push(...plane.getAllPoints());
      }
      expect(allPoints.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Methods', () => {
    describe('addFreePoint2D', () => {
      it('should create and add a free point with generated ID', () => {
        const position = new Vector3(10, 20, 1);
        const point = planeH.addFreePoint2D(position, world);

        expect(point.id).toMatch(/^proj_plane_\d+\/point2d_\d+$/);
        expect(point.position).toEqual(position);
        expect(point.planeId).toBe(planeH.id);
        
        // Verify in world by searching through planes
        let foundPoint;
        for (const plane of world.projectionPlanes.values()) {
          foundPoint = plane.getPoint(point.id);
          if (foundPoint) break;
        }
        expect(foundPoint).toBe(point);
      });

      it('should create point with auto-generated ID', () => {
        const position = new Vector3(10, 20, 1);
        const point = planeH.addFreePoint2D(position, world);

        expect(point.id).toMatch(/^proj_plane_\d+\/point2d_\d+$/);  // Verify hierarchical format
        
        // Verify in world
        let foundPoint;
        for (const plane of world.projectionPlanes.values()) {
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
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const p3 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p4 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);

        const line1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const line2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world);

        const intersection = planeH.addLineLineIntersection(
          line1.id,
          line2.id,
          world
        );

        expect(intersection.id).toMatch(/^proj_plane_\d+\/point2d_\d+$/);
        expect(intersection.planeId).toBe(planeH.id);
        expect(planeH.getPoint(intersection.id)).toBe(intersection);
      });

      it('should use provided ID when given', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const p3 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p4 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);

        const line1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const line2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world);

        const customId = planeH.id + '/custom_intersection';
        const intersection = planeH.addLineLineIntersection(
          line1.id,
          line2.id,
          world,
          customId
        );

        expect(intersection.id).toBe(customId);
      });

      it('should throw error for non-existent lines', () => {
        expect(() => {
          planeH.addLineLineIntersection('invalid_line1', 'invalid_line2', world);
        }).toThrow();
      });

      it('should throw error for parallel lines', () => {
        // Create two horizontal parallel lines
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const p3 = planeH.addFreePoint2D(new Vector3(0, 5, 1), world);
        const p4 = planeH.addFreePoint2D(new Vector3(10, 5, 1), world);

        const line1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const line2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world); // Parallel to line1

        // After Phase 23, parallel lines create infeasible intersection point instead of throwing
        const point = planeH.addLineLineIntersection(line1.id, line2.id, world);
        const realization = point.realize2D(world);
        expect(realization).toBeDefined();
        expect(realization!.feasible).toBe(false);
      });
    });

    // T055m: Tests for sibling creation with HalfHingeLine2D
    // NOTE: addIntersectionPoint2DWithSibling method was removed
    // These tests are commented out until sibling functionality is re-implemented
    describe.skip('addIntersectionPoint2DWithSibling', () => {
      it('should create only primary point when neither element is HHL', () => {
        // Create two regular lines
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const p3 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p4 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);

        const line1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const line2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world);

        const result = planeH.addIntersectionPoint2DWithSibling(
          line1.id,
          line2.id,
          0,
          world
        );

        expect(result.primary).toBeDefined();
        expect(result.primary.planeId).toBe('proj_plane_H');
        expect(result.sibling).toBeUndefined();
      });

      it('should create sibling when element1 is HalfHingeLine2D', () => {
        // Use the existing HalfHingeLine2D on proj_plane_H (created in World constructor)
        const hhlId = 'half_HL_HV_on_PH';

        // Create a regular line that intersects the HHL
        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeH.addIntersectionPoint2DWithSibling(
          hhlId,
          verticalLine.id,
          0,
          world
        );

        expect(result.primary).toBeDefined();
        expect(result.primary.planeId).toBe('proj_plane_H');
        expect(result.sibling).toBeDefined();
        expect(result.sibling).toBeInstanceOf(SiblingIntersectionPoint2D);
        expect(result.sibling!.planeId).toBe('proj_plane_V');
        expect(result.sibling!.primaryIntersectionId).toBe(result.primary.id);
      });

      it('should create sibling when element2 is HalfHingeLine2D', () => {
        // Use the existing HalfHingeLine2D on proj_plane_V
        const hhlId = 'half_HL_HV_on_PV';

        // Create a regular line that intersects the HHL
        const p1 = planeV.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeV.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeV.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeV.addIntersectionPoint2DWithSibling(
          verticalLine.id,
          hhlId,
          0,
          world
        );

        expect(result.primary).toBeDefined();
        expect(result.primary.planeId).toBe('proj_plane_V');
        expect(result.sibling).toBeDefined();
        expect(result.sibling!.planeId).toBe('proj_plane_H');
        expect(result.sibling!.primaryIntersectionId).toBe(result.primary.id);
      });

      it('should establish bidirectional link between primary and sibling', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeH.addIntersectionPoint2DWithSibling(
          hhlId,
          verticalLine.id,
          0,
          world
        );

        // Primary → sibling link
        expect(result.primary.siblingPointId).toBe(result.sibling!.id);
        
        // Sibling → primary link
        expect(result.sibling!.primaryIntersectionId).toBe(result.primary.id);
      });

      it('should use provided IDs for redo operations', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeH.addIntersectionPoint2DWithSibling(
          hhlId,
          verticalLine.id,
          0,
          world,
          'custom_primary_id',
          'custom_sibling_id'
        );

        expect(result.primary.id).toBe('custom_primary_id');
        expect(result.sibling!.id).toBe('custom_sibling_id');
      });

      it('should copy label from primary to sibling', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        // Create intersection - primary has no label yet
        const result = planeH.addIntersectionPoint2DWithSibling(
          hhlId,
          verticalLine.id,
          0,
          world
        );
        
        // Both should have no label (label is copied at creation time)
        expect(result.primary.label).toBeUndefined();
        expect(result.sibling!.label).toBeUndefined();
        
        // If we set label on primary after creation, sibling doesn't auto-update
        // (This is expected behavior - label is copied once at creation)
        result.primary.label = 'Point P';
        expect(result.primary.label).toBe('Point P');
        expect(result.sibling!.label).toBeUndefined(); // Sibling still has no label
      });

      it('should determine correct sibling plane for proj_plane_H', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeH.addIntersectionPoint2DWithSibling(
          hhlId,
          verticalLine.id,
          0,
          world
        );

        expect(result.sibling!.planeId).toBe('proj_plane_V');
      });

      it('should determine correct sibling plane for proj_plane_V', () => {
        const hhlId = 'half_HL_HV_on_PV';

        const p1 = planeV.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeV.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeV.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeV.addIntersectionPoint2DWithSibling(
          verticalLine.id,
          hhlId,
          0,
          world
        );

        expect(result.sibling!.planeId).toBe('proj_plane_H');
      });

      it('should add sibling to world storage', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const verticalLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const result = planeH.addIntersectionPoint2DWithSibling(
          hhlId,
          verticalLine.id,
          0,
          world
        );

        const retrievedSibling = world.getPoint2DById(result.sibling!.id);
        expect(retrievedSibling).toBe(result.sibling);
        expect(retrievedSibling).toBeInstanceOf(SiblingIntersectionPoint2D);
      });
    });

    describe('addLine2DBetweenTwoPoints', () => {
      it('should create line between two points', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);

        const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        expect(line.id).toMatch(/^proj_plane_\d+\/line2d_\d+$/);
        expect(line.planeId).toBe(planeH.id);
        expect(planeH.getLine(line.id)).toBe(line);
      });

      it('should use provided ID', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);

        const customId = planeH.id + '/custom_line';
        const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world, customId);

        expect(line.id).toBe(customId);
      });

      it('should throw error for identical points', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);

        expect(() => {
          planeH.addLine2DBetweenTwoPoints(p1.id, p1.id, world);
        }).toThrow(/point|distinct/i);
      });

      it('should throw error for non-existent points', () => {
        expect(() => {
          planeH.addLine2DBetweenTwoPoints('invalid_p1', 'invalid_p2', world);
        }).toThrow();
      });
    });

    describe('addSegment2DBetweenPoints', () => {
      it('should create segment between two points', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);

        const segment = planeH.addSegment2DBetweenPoints(p1.id, p2.id, world);

        expect(segment.id).toMatch(/^proj_plane_\d+\/segment2d_\d+$/);
        expect(segment.planeId).toBe(planeH.id);
        expect(planeH.getLine(segment.id)).toBe(segment);
      });

      it('should use provided ID', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);

        const customId = planeH.id + '/custom_segment';
        const segment = planeH.addSegment2DBetweenPoints(p1.id, p2.id, world, customId);

        expect(segment.id).toBe(customId);
      });

      it('should throw error for identical points', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);

        expect(() => {
          planeH.addSegment2DBetweenPoints(p1.id, p1.id, world);
        }).toThrow(/point|segment/i);
      });
    });

    describe('addCircle2DByCenterAndPoint', () => {
      it('should create circle with center and circumference point', () => {
        const center = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const circumPoint = planeH.addFreePoint2D(new Vector3(15, 5, 1), world);

        const circle = planeH.addCircle2DByCenterAndPoint(center.id, circumPoint.id, world);

        expect(circle.id).toMatch(/^proj_plane_\d+\/circle2d_\d+$/);
        expect(planeH.getCircle(circle.id)).toBe(circle);
      });

      it('should use provided ID', () => {
        const center = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const circumPoint = planeH.addFreePoint2D(new Vector3(15, 5, 1), world);

        const customId = planeH.id + '/custom_circle';
        const circle = planeH.addCircle2DByCenterAndPoint(center.id, circumPoint.id, world, customId);

        expect(circle.id).toBe(customId);
      });

      it('should throw error for non-existent center point', () => {
        const circumPoint = planeH.addFreePoint2D(new Vector3(15, 5, 1), world);

        expect(() => {
          planeH.addCircle2DByCenterAndPoint('invalid', circumPoint.id, world);
        }).toThrow(/point/i);
      });
    });

    describe('addGuide2D', () => {
      it('should create guide perpendicular to reference line through point', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const throughPoint = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        
        const referenceLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const guide = planeH.addGuide2D(referenceLine.id, throughPoint.id, world);

        expect(guide.id).toMatch(/^proj_plane_\d+\/guide2d_\d+$/);
        expect(planeH.getLine(guide.id)).toBe(guide);
      });

      it('should use provided ID', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const throughPoint = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        
        const referenceLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const customId = planeH.id + '/custom_guide';
        const guide = planeH.addGuide2D(referenceLine.id, throughPoint.id, world, customId);

        expect(guide.id).toBe(customId);
      });

      it('should throw error for non-existent reference line', () => {
        const point = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        
        expect(() => {
          planeH.addGuide2D('invalid_line', point.id, world);
        }).toThrow(/line/i);
      });

      it('should throw error for non-existent through point', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const referenceLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        
        expect(() => {
          planeH.addGuide2D(referenceLine.id, 'invalid_point', world);
        }).toThrow(/point/i);
      });
    });

    describe('Removal Methods', () => {
      it('should remove point and return success', () => {
        const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);
        const pointId = point.id;

        const removed = planeH.removePoint(pointId);

        expect(removed).toBe(true);
        expect(planeH.getPoint(pointId)).toBeUndefined();
      });

      it('should remove line and return success', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
        const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const removed = planeH.removeLine(line.id);

        expect(removed).toBe(true);
        expect(planeH.getLine(line.id)).toBeUndefined();
      });

      it('should remove segment and return success', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
        const segment = planeH.addSegment2DBetweenPoints(p1.id, p2.id, world);

        const removed = planeH.removeLine(segment.id); // Segments are Line2D

        expect(removed).toBe(true);
        expect(planeH.getLine(segment.id)).toBeUndefined();
      });

      it('should remove guide and return success', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const throughPoint = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const referenceLine = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const guide = planeH.addGuide2D(referenceLine.id, throughPoint.id, world);

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
        const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);

        const realization = point.realize2D(world);

        expect(realization).toBeDefined();
        expect(realization?.position.x).toBe(10);
        expect(realization?.position.y).toBe(20);
      });

      it('should update realizations when line added', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
        const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const realization = line.realize2D(world);

        expect(realization).toBeDefined();
      });

      it('should update realizations when segment added', () => {
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
        const segment = planeH.addSegment2DBetweenPoints(p1.id, p2.id, world);

        // Phase 22.5: Segments are Line2D, use realize2D
        const realization = segment.realize2D(world);

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
        
        const hingeLine = world.getHingeLineFromHalfHingeLine(halfHL.id);

        expect(hingeLine).toBeDefined();
        expect(hingeLine?.plane1Id).toBe(planeH.id);
        expect(hingeLine?.plane2Id).toBe(planeV.id);
      });

      it('should return parent HingeLine for HalfHingeLine2D on P_V', () => {
        // Find the HalfHingeLine2D on P_V (created during initialization)
        const halfHLs = planeV.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const halfHL = halfHLs[0] as HalfHingeLine2D;
        
        const hingeLine = world.getHingeLineFromHalfHingeLine(halfHL.id);

        expect(hingeLine).toBeDefined();
      });

      it('should return undefined for non-existent HalfHingeLine2D', () => {
        const hingeLine = world.getHingeLineFromHalfHingeLine('P_H/nonexistent');

        expect(hingeLine).toBeUndefined();
      });

      it('should return undefined for non-HalfHingeLine element', () => {
        // Create a regular line
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
        const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        const hingeLine = world.getHingeLineFromHalfHingeLine(line.id);

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
        const p1 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);
        const line = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        // Create intersection point
        const intersection = planeH.addLineLineIntersection(hhlId, line.id, world);

        const siblingPlaneId = world.getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBe(planeV.id);
      });

      it('should return sibling plane for line-HHL intersection on P_V', () => {
        // Find the HalfHingeLine2D on P_V
        const halfHLs = planeV.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const hhlId = halfHLs[0].id;

        // Create a regular line
        const p1 = planeV.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p2 = planeV.addFreePoint2D(new Vector3(5, 5, 1), world);
        const line = planeV.addLine2DBetweenTwoPoints(p1.id, p2.id, world);

        // Create intersection point
        const intersection = planeV.addLineLineIntersection(line.id, hhlId, world);

        const siblingPlaneId = world.getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBe(planeH.id);
      });

      it('should return undefined for regular line-line intersection (no HHL)', () => {
        // Create two regular lines
        const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const p2 = planeH.addFreePoint2D(new Vector3(10, 0, 1), world);
        const p3 = planeH.addFreePoint2D(new Vector3(5, -5, 1), world);
        const p4 = planeH.addFreePoint2D(new Vector3(5, 5, 1), world);

        const line1 = planeH.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
        const line2 = planeH.addLine2DBetweenTwoPoints(p3.id, p4.id, world);

        // Create intersection point
        const intersection = planeH.addLineLineIntersection(line1.id, line2.id, world);

        const siblingPlaneId = world.getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBeUndefined();
      });

      it('should return sibling plane for circle-HHL intersection', () => {
        // Find the HalfHingeLine2D on P_H
        const halfHLs = planeH.getAllLines().filter(l => l instanceof HalfHingeLine2D);
        expect(halfHLs.length).toBeGreaterThan(0);
        const hhlId = halfHLs[0].id;

        // Create a circle that intersects the HHL
        const center = planeH.addFreePoint2D(new Vector3(5, 3, 1), world);
        const radiusPoint = planeH.addFreePoint2D(new Vector3(5, 8, 1), world);
        const circle = planeH.addCircle2DByCenterAndPoint(center.id, radiusPoint.id, world);

        // Create intersection point (circle-line)
        const intersection = planeH.addLineCircleIntersection(hhlId, circle.id, 0, world);

        const siblingPlaneId = world.getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBe(planeV.id);
      });

      it('should return undefined for circle-circle intersection (no HHL)', () => {
        // Create two circles
        const c1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
        const r1 = planeH.addFreePoint2D(new Vector3(5, 0, 1), world);
        const circle1 = planeH.addCircle2DByCenterAndPoint(c1.id, r1.id, world);

        const c2 = planeH.addFreePoint2D(new Vector3(8, 0, 1), world);
        const r2 = planeH.addFreePoint2D(new Vector3(13, 0, 1), world);
        const circle2 = planeH.addCircle2DByCenterAndPoint(c2.id, r2.id, world);

        // Create intersection point
        const intersection = planeH.addCircleCircleIntersection(circle1.id, circle2.id, 0, world);

        const siblingPlaneId = world.getSiblingPlaneForIntersection(intersection);

        expect(siblingPlaneId).toBeUndefined();
      });

      it('should return undefined for non-intersection point', () => {
        // Create a free point
        const point = planeH.addFreePoint2D(new Vector3(10, 20, 1), world);

        const siblingPlaneId = world.getSiblingPlaneForIntersection(point);

        expect(siblingPlaneId).toBeUndefined();
      });
    });
  });
});
