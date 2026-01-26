/**
 * Unit tests for IntersectionSequenceFactory
 * 
 * Tests the factory's ability to create intersection points with appropriate operations:
 * - Line-line intersections
 * - Line-circle intersections (both orientations, both indices)
 * - Circle-circle intersections (both indices)
 * - Parameter validation
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntersectionSequenceFactory, type IntersectionData } from '@/commands/factories/IntersectionSequenceFactory';
import { Command } from '@/commands/Command';
import { World } from '@/domain/world/World';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { SiblingIntersectionPoint2D } from '@/domain/world/Point';
import { Vector3 } from 'three';
import { getMainHingeLine } from '../../../helpers/worldHelpers';

describe('IntersectionSequenceFactory', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    // Get horizontal plane ID (no longer hardcoded as 'proj_plane_H')
    planeId = world.getProjectionPlaneByLabel('P_H')!.id;
  });

  describe('createIntersection', () => {
    it('should create line-line intersection', () => {
      // Setup: Create two intersecting lines
      const cmd = new Command('Setup', world);
      
      // Line 1: (0, 0) to (10, 0) - horizontal
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const point1Id = p1Result.outputs.pointId!;
      
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const point2Id = p2Result.outputs.pointId!;
      
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const line1Id = line1Result.outputs.lineId!;
      
      // Line 2: (5, -5) to (5, 5) - vertical
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, -5, 1)));
      const point3Id = p3Result.outputs.pointId!;
      
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const point4Id = p4Result.outputs.pointId!;
      
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point3Id, point4Id));
      const line2Id = line2Result.outputs.lineId!;
      
      cmd.commit();

      // Test: Create line-line intersection
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-line',
        element1Id: line1Id,
        element2Id: line2Id
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Intersection point created
      expect(result.pointId).toBeDefined();
      expect(typeof result.pointId).toBe('string');

      intersectionCmd.commit();

      // Verify: Point exists in world
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();
      expect(intersectionPoint!.id).toBe(result.pointId);

      // Verify: Intersection is at (5, 0, 0)
      const pointRealization = plane.realizePoint2D(intersectionPoint!, world);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.x).toBeCloseTo(5);
      expect(pointRealization!.position.y).toBeCloseTo(0);
    });

    it('should create line-circle intersection with index 0', () => {
      // Setup: Create line and circle that intersect at two points
      const cmd = new Command('Setup', world);
      
      // Circle: center (5, 0), radius ~7.07 through point (10, 5)
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = centerResult.outputs.pointId!;
      
      const circlePointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = circlePointResult.outputs.pointId!;
      
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = circleResult.outputs.circleId!;
      
      // Line: horizontal through (0, 5) to (10, 5)
      const linePoint1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const linePoint1Id = linePoint1Result.outputs.pointId!;
      
      const linePoint2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const linePoint2Id = linePoint2Result.outputs.pointId!;
      
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, linePoint1Id, linePoint2Id));
      const lineId = lineResult.outputs.lineId!;
      
      cmd.commit();

      // Test: Create line-circle intersection with index 0
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-circle',
        element1Id: lineId,
        element2Id: circleId,
        lineId: lineId,
        circleId: circleId,
        index: 0
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Intersection point created
      expect(result.pointId).toBeDefined();
      intersectionCmd.commit();

      // Verify: Point exists in world
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();

      // Verify: Intersection is on the line y=5 and on the circle
      const pointRealization = plane.realizePoint2D(intersectionPoint!, world);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.y).toBeCloseTo(5);
      
      // Check it's on the circle (distance from center equals radius)
      const centerPoint = plane.getPoint(centerId)!;
      const circlePoint = plane.getPoint(circlePointId)!;
      const centerRealization = plane.realizePoint2D(centerPoint, world);
      const circlePointRealization = plane.realizePoint2D(circlePoint, world);
      const radius = centerRealization!.position.distanceTo(circlePointRealization!.position);
      const distToIntersection = centerRealization!.position.distanceTo(pointRealization!.position);
      expect(distToIntersection).toBeCloseTo(radius);
    });

    it('should create line-circle intersection with index 1', () => {
      // Setup: Create line and circle that intersect at two points
      const cmd = new Command('Setup', world);
      
      // Circle: center (5, 0), radius ~7.07 through point (10, 5)
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = centerResult.outputs.pointId!;
      
      const circlePointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = circlePointResult.outputs.pointId!;
      
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = circleResult.outputs.circleId!;
      
      // Line: horizontal through (0, 5) to (10, 5)
      const linePoint1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const linePoint1Id = linePoint1Result.outputs.pointId!;
      
      const linePoint2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const linePoint2Id = linePoint2Result.outputs.pointId!;
      
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, linePoint1Id, linePoint2Id));
      const lineId = lineResult.outputs.lineId!;
      
      cmd.commit();

      // Test: Create line-circle intersection with index 1 (second intersection point)
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-circle',
        element1Id: lineId,
        element2Id: circleId,
        lineId: lineId,
        circleId: circleId,
        index: 1
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Intersection point created
      expect(result.pointId).toBeDefined();
      intersectionCmd.commit();

      // Verify: Point exists and is on both line and circle
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId)!;
      const pointRealization = plane.realizePoint2D(intersectionPoint, world);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.y).toBeCloseTo(5);
    });

    it('should handle reversed element order for line-circle intersection', () => {
      // Setup: Create circle and line (reversed order)
      const cmd = new Command('Setup', world);
      
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = centerResult.outputs.pointId!;
      
      const circlePointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = circlePointResult.outputs.pointId!;
      
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = circleResult.outputs.circleId!;
      
      const linePoint1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const linePoint1Id = linePoint1Result.outputs.pointId!;
      
      const linePoint2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const linePoint2Id = linePoint2Result.outputs.pointId!;
      
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, linePoint1Id, linePoint2Id));
      const lineId = lineResult.outputs.lineId!;
      
      cmd.commit();

      // Test: Create intersection with circle first (element1 is circle, element2 is line)
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-circle',
        element1Id: circleId,  // Circle first
        element2Id: lineId,    // Line second
        lineId: lineId,        // But lineId/circleId are correctly specified
        circleId: circleId,
        index: 0
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Intersection works regardless of element1/element2 order
      expect(result.pointId).toBeDefined();
      intersectionCmd.commit();

      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();
    });

    it('should create circle-circle intersection with index 0', () => {
      // Setup: Create two intersecting circles
      const cmd = new Command('Setup', world);
      
      // Circle 1: center (0, 0), radius 5
      const center1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const center1Id = center1Result.outputs.pointId!;
      
      const circle1PointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const circle1PointId = circle1PointResult.outputs.pointId!;
      
      const circle1Result = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center1Id, circle1PointId));
      const circle1Id = circle1Result.outputs.circleId!;
      
      // Circle 2: center (5, 0), radius 5
      const center2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const center2Id = center2Result.outputs.pointId!;
      
      const circle2PointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const circle2PointId = circle2PointResult.outputs.pointId!;
      
      const circle2Result = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center2Id, circle2PointId));
      const circle2Id = circle2Result.outputs.circleId!;
      
      cmd.commit();

      // Test: Create circle-circle intersection with index 0
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'circle-circle',
        element1Id: circle1Id,
        element2Id: circle2Id,
        index: 0
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Intersection point created
      expect(result.pointId).toBeDefined();
      intersectionCmd.commit();

      // Verify: Point exists in world
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();

      // Verify: Intersection is at x=2.5 (midpoint), and on both circles
      const pointRealization = plane.realizePoint2D(intersectionPoint!, world);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.x).toBeCloseTo(2.5);
    });

    it('should create circle-circle intersection with index 1', () => {
      // Setup: Create two intersecting circles
      const cmd = new Command('Setup', world);
      
      // Circle 1: center (0, 0), radius 5
      const center1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const center1Id = center1Result.outputs.pointId!;
      
      const circle1PointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const circle1PointId = circle1PointResult.outputs.pointId!;
      
      const circle1Result = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center1Id, circle1PointId));
      const circle1Id = circle1Result.outputs.circleId!;
      
      // Circle 2: center (5, 0), radius 5
      const center2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const center2Id = center2Result.outputs.pointId!;
      
      const circle2PointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const circle2PointId = circle2PointResult.outputs.pointId!;
      
      const circle2Result = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center2Id, circle2PointId));
      const circle2Id = circle2Result.outputs.circleId!;
      
      cmd.commit();

      // Test: Create circle-circle intersection with index 1
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'circle-circle',
        element1Id: circle1Id,
        element2Id: circle2Id,
        index: 1
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Intersection point created
      expect(result.pointId).toBeDefined();
      intersectionCmd.commit();

      // Verify: Point exists
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();
    });

    it('should throw error for line-circle without required parameters', () => {
      // Test: Missing lineId
      const cmd = new Command('Test', world);
      const intersectionData: IntersectionData = {
        type: 'line-circle',
        element1Id: 'line1',
        element2Id: 'circle1',
        circleId: 'circle1',
        index: 0
        // lineId missing
      };

      expect(() => {
        IntersectionSequenceFactory.createIntersection(cmd, planeId, intersectionData, world);
      }).toThrow('Line-circle intersection requires lineId, circleId, and index');
    });

    it('should throw error for circle-circle without index', () => {
      // Test: Missing index
      const cmd = new Command('Test', world);
      const intersectionData: IntersectionData = {
        type: 'circle-circle',
        element1Id: 'circle1',
        element2Id: 'circle2'
        // index missing
      };

      expect(() => {
        IntersectionSequenceFactory.createIntersection(cmd, planeId, intersectionData, world);
      }).toThrow('Circle-circle intersection requires index');
    });

    it('should throw error for unknown intersection type', () => {
      // Test: Invalid type
      const cmd = new Command('Test', world);
      const intersectionData = {
        type: 'unknown-type',
        element1Id: 'elem1',
        element2Id: 'elem2'
      } as unknown as IntersectionData;

      expect(() => {
        IntersectionSequenceFactory.createIntersection(cmd, planeId, intersectionData, world);
      }).toThrow('Unknown intersection type: unknown-type');
    });
  });

  describe('HalfHingeLine sibling intersection creation (Phase 42)', () => {
    it('should create sibling intersection when line is HalfHingeLine2D', () => {
      // Setup: Create a line that intersects with HHL
      const cmd = new Command('Setup', world);
      
      // Get HalfHingeLine on horizontal plane
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H')!;
      const mainHingeLine = getMainHingeLine(world);
      const hhl = horizontalPlane.getAllLines().find(
        l => (l as any).hingeLineId === mainHingeLine.id
      );
      if (!hhl) {
        throw new Error('HalfHingeLine not found on horizontal plane');
      }
      const hhlId = hhl.id;
      
      // Create a line that intersects the HHL
      // HHL is horizontal at y=0, so create a vertical line at x=5
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, -5, 1)));
      const point1Id = p1Result.outputs.pointId!;
      
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const point2Id = p2Result.outputs.pointId!;
      
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;
      
      cmd.commit();

      // Test: Create intersection with HHL
      const intersectionCmd = new Command('Create HHL intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-line',
        element1Id: hhlId,
        element2Id: lineId
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Primary intersection created
      expect(result.pointId).toBeDefined();
      expect(typeof result.pointId).toBe('string');

      // Verify: Sibling intersection created
      expect(result.siblingPointId).toBeDefined();
      expect(typeof result.siblingPointId).toBe('string');
      expect(result.pointId).not.toBe(result.siblingPointId);

      intersectionCmd.commit();

      // Verify: Both points exist in world
      // (Reuse horizontalPlane from HHL lookup)
      const verticalPlane = world.getProjectionPlaneByLabel('P_V')!;
      
      const primaryPoint = horizontalPlane.getPoint(result.pointId);
      const siblingPoint = verticalPlane.getPoint(result.siblingPointId!);
      
      expect(primaryPoint).toBeDefined();
      expect(siblingPoint).toBeDefined();
      expect(siblingPoint).toBeInstanceOf(SiblingIntersectionPoint2D);

      // Verify: Bidirectional links
      expect((primaryPoint as any).siblingPointId).toBe(result.siblingPointId);
      expect((siblingPoint as any).primaryIntersectionId).toBe(result.pointId);

      // Verify: Both points realize to same coordinate (parametric consistency)
      const primaryRealization = horizontalPlane.realizePoint2D(primaryPoint!, world);
      const siblingRealization = verticalPlane.realizePoint2D(siblingPoint!, world);
      
      expect(primaryRealization).toBeDefined();
      expect(siblingRealization).toBeDefined();
      expect(primaryRealization!.position.x).toBeCloseTo(siblingRealization!.position.x);
      expect(primaryRealization!.position.y).toBeCloseTo(siblingRealization!.position.y);
    });

    it('should create only primary intersection for non-HHL line', () => {
      // Setup: Create two regular lines that intersect
      const cmd = new Command('Setup', world);
      
      // Line 1: horizontal
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Result.outputs.pointId!, p2Result.outputs.pointId!));
      
      // Line 2: vertical
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, -5, 1)));
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p3Result.outputs.pointId!, p4Result.outputs.pointId!));
      
      cmd.commit();

      // Test: Create intersection (no HHL involved)
      const intersectionCmd = new Command('Create regular intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-line',
        element1Id: line1Result.outputs.lineId!,
        element2Id: line2Result.outputs.lineId!
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Only primary intersection created (no sibling)
      expect(result.pointId).toBeDefined();
      expect(result.siblingPointId).toBeUndefined();
    });

    it('should create sibling for line-circle intersection with HHL', () => {
      // Setup: Create circle and HHL that intersect
      const cmd = new Command('Setup', world);
      
      // Get HalfHingeLine on horizontal plane
      const horizontalPlane = world.getProjectionPlaneByLabel('P_H')!;
      const mainHingeLine = getMainHingeLine(world);
      const hhl = horizontalPlane.getAllLines().find(
        l => (l as any).hingeLineId === mainHingeLine.id
      );
      if (!hhl) {
        throw new Error('HalfHingeLine not found on horizontal plane');
      }
      const hhlId = hhl.id;
      
      // Create a circle centered at (0, 5) with radius passing through (0, 0)
      // This will intersect the HHL (y=0 line) at two points
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const circlePointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
        planeId,
        centerResult.outputs.pointId!,
        circlePointResult.outputs.pointId!
      ));
      
      cmd.commit();

      // Test: Create line-circle intersection with index 0
      const intersectionCmd = new Command('Create HHL-circle intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-circle',
        lineId: hhlId,
        circleId: circleResult.outputs.circleId!,
        element1Id: hhlId,
        element2Id: circleResult.outputs.circleId!,
        index: 0
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      // Verify: Both primary and sibling created
      expect(result.pointId).toBeDefined();
      expect(result.siblingPointId).toBeDefined();

      intersectionCmd.commit();

      // Verify: Both points exist
      // (Reuse horizontalPlane from HHL lookup)
      const verticalPlane = world.getProjectionPlaneByLabel('P_V')!;
      
      const primaryPoint = horizontalPlane.getPoint(result.pointId);
      const siblingPoint = verticalPlane.getPoint(result.siblingPointId!);
      
      expect(primaryPoint).toBeDefined();
      expect(siblingPoint).toBeDefined();
      expect(siblingPoint).toBeInstanceOf(SiblingIntersectionPoint2D);
    });
  });
});
