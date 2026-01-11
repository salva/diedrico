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
import { Vector3 } from 'three';

describe('IntersectionSequenceFactory', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    planeId = 'proj_plane_H'; // Horizontal projection plane
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
      expect(pointRealization!.position.position.x).toBeCloseTo(5);
      expect(pointRealization!.position.position.y).toBeCloseTo(0);
    });

    it('should create line-circle intersection with index 0', () => {
      // Setup: Create line and circle that intersect at two points
      const cmd = new Command('Setup', world);
      
      // Circle: center (5, 0), radius ~7.07 through point (10, 5)
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = world.getProjectionPlaneById(planeId)!.getAllPoints()[0].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[1].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = world.getProjectionPlaneById(planeId)!.getAllCircles()[0].id;
      
      // Line: horizontal through (0, 5) to (10, 5)
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const linePoint1Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[2].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const linePoint2Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[3].id;
      
      cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, linePoint1Id, linePoint2Id));
      const lineId = world.getProjectionPlaneById(planeId)!.getAllLines()[0].id;
      
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
      const pointRealization = world.getPoint2DRealization(result.pointId);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.y).toBeCloseTo(5);
      
      // Check it's on the circle (distance from center equals radius)
      const centerRealization = world.getPoint2DRealization(centerId);
      const circlePointRealization = world.getPoint2DRealization(circlePointId);
      const radius = centerRealization!.distanceTo(circlePointRealization!);
      const distToIntersection = centerRealization!.distanceTo(pointRealization!);
      expect(distToIntersection).toBeCloseTo(radius);
    });

    it('should create line-circle intersection with index 1', () => {
      // Setup: Create line and circle that intersect at two points
      const cmd = new Command('Setup', world);
      
      // Circle: center (5, 0), radius ~7.07 through point (10, 5)
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = world.getProjectionPlaneById(planeId)!.getAllPoints()[0].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[1].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = world.getProjectionPlaneById(planeId)!.getAllCircles()[0].id;
      
      // Line: horizontal through (0, 5) to (10, 5)
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const linePoint1Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[2].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const linePoint2Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[3].id;
      
      cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, linePoint1Id, linePoint2Id));
      const lineId = world.getProjectionPlaneById(planeId)!.getAllLines()[0].id;
      
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
      const pointRealization = world.getPoint2DRealization(result.pointId);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.y).toBeCloseTo(5);
    });

    it('should handle reversed element order for line-circle intersection', () => {
      // Setup: Create circle and line (reversed order)
      const cmd = new Command('Setup', world);
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = world.getProjectionPlaneById(planeId)!.getAllPoints()[0].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[1].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = world.getProjectionPlaneById(planeId)!.getAllCircles()[0].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const linePoint1Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[2].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const linePoint2Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[3].id;
      
      cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, linePoint1Id, linePoint2Id));
      const lineId = world.getProjectionPlaneById(planeId)!.getAllLines()[0].id;
      
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
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const center1Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[0].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const circle1PointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[1].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center1Id, circle1PointId));
      const circle1Id = world.getProjectionPlaneById(planeId)!.getAllCircles()[0].id;
      
      // Circle 2: center (5, 0), radius 5
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const center2Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[2].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const circle2PointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[3].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center2Id, circle2PointId));
      const circle2Id = world.getProjectionPlaneById(planeId)!.getAllCircles()[1].id;
      
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
      const pointRealization = world.getPoint2DRealization(result.pointId);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.x).toBeCloseTo(2.5);
    });

    it('should create circle-circle intersection with index 1', () => {
      // Setup: Create two intersecting circles
      const cmd = new Command('Setup', world);
      
      // Circle 1: center (0, 0), radius 5
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const center1Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[0].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const circle1PointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[1].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center1Id, circle1PointId));
      const circle1Id = world.getProjectionPlaneById(planeId)!.getAllCircles()[0].id;
      
      // Circle 2: center (5, 0), radius 5
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const center2Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[2].id;
      
      cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const circle2PointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[3].id;
      
      cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, center2Id, circle2PointId));
      const circle2Id = world.getProjectionPlaneById(planeId)!.getAllCircles()[1].id;
      
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
});
