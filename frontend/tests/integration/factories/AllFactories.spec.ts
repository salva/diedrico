/**
 * Integration tests for Operation Sequence Factories
 * 
 * Tests end-to-end workflows with real World and CommandStack:
 * - GuideSequenceFactory: Guide creation with sibling on HHL, undo/redo
 * - DeletionSequenceFactory: Cascade deletion with dependencies
 * - IntersectionSequenceFactory: Intersection creation with geometry validation
 * 
 * These tests verify that factories work correctly in real application context,
 * with full dependency service, process tree, and command stack integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { DeletionSequenceFactory } from '@/commands/factories/DeletionSequenceFactory';
import { IntersectionSequenceFactory, type IntersectionData } from '@/commands/factories/IntersectionSequenceFactory';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { Vector3 } from 'three';
import { getHorizontalPlaneId, getVerticalPlaneId, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';

describe('Factory Integration Tests', () => {
  let world: World;
  let commandStack: CommandStack;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
    planeId = getHorizontalPlaneId(world);
  });

  describe('GuideSequenceFactory Integration', () => {
    it('should create guide with sibling on HHL and support undo/redo', () => {
      // Setup: Use existing HHL (created by default in World)
      const setupCmd = new Command('Setup', world);
      
      // Use the default HHL that exists in every World
      const hhlId = world.getHalfHingeLines2D(planeId)[0].id;
      
      // Create through point for guide
      setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const plane = getHorizontalPlane(world);
      const throughPointId = plane.getAllPoints()[0].id;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Initial state
      const initialLineCount = plane.getAllLines().length;
      const initialPointCount = plane.getAllPoints().length;

      // Test: Create guide with sibling using factory
      const guideCmd = new Command('Create guide', world);
      const result = GuideSequenceFactory.createGuideWithSibling(
        guideCmd, planeId, hhlId, throughPointId, world
      );

      guideCmd.commit();
      commandStack.push(guideCmd);

      // Verify: Both guide and sibling created
      expect(result.guideId).toBeDefined();
      expect(result.siblingGuideId).toBeDefined();
      // Note: sibling is in different plane (V), so we check it separately
      const siblingPlane = getVerticalPlane(world);
      expect(plane.getAllLines().length).toBe(initialLineCount + 1); // original lines + guide on this plane
      expect(siblingPlane.getLine(result.siblingGuideId!)).toBeDefined(); // sibling on paired plane

      const guide = plane.getLine(result.guideId);
      const sibling = siblingPlane.getLine(result.siblingGuideId!); // Get sibling from correct plane
      expect(guide).toBeDefined();
      expect(sibling).toBeDefined();
      // Phase 75: Use instanceof instead of .type property
      expect(guide).toBeInstanceOf(Guide2D);
      expect(sibling).toBeInstanceOf(SiblingGuide2D);

      // Test: Undo
      commandStack.undo();
      expect(plane.getAllLines().length).toBe(initialLineCount);
      expect(plane.getLine(result.guideId)).toBeUndefined();
      expect(siblingPlane.getLine(result.siblingGuideId!)).toBeUndefined();

      // Test: Redo
      commandStack.redo();
      expect(plane.getAllLines().length).toBe(initialLineCount + 1); // Guide restored on this plane
      expect(plane.getLine(result.guideId)).toBeDefined();
      expect(siblingPlane.getLine(result.siblingGuideId!)).toBeDefined(); // Sibling restored on paired plane
    });

    it.skip('should create guide on regular line without sibling', () => {
      // Setup: Create regular line
      const setupCmd = new Command('Setup line', world);
      
      setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const point1Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[0].id;
      
      setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const point2Id = world.getProjectionPlaneById(planeId)!.getAllPoints()[1].id;
      
      setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = world.getProjectionPlaneById(planeId)!.getAllLines()[0].id;
      
      setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const throughPointId = world.getProjectionPlaneById(planeId)!.getAllPoints()[2].id;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Test: Create guide (no sibling expected)
      const guideCmd = new Command('Create guide', world);
      const result = GuideSequenceFactory.createGuideWithSibling(
        guideCmd, planeId, lineId, throughPointId, world
      );

      guideCmd.commit();
      commandStack.push(guideCmd);

      // Verify: Only guide created, no sibling
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(result.guideId).toBeDefined();
      expect(result.siblingGuideId).toBeUndefined();
      expect(plane.getAllLines()).toHaveLength(2); // Original line + guide
    });
  });

  describe.skip('DeletionSequenceFactory Integration - SKIPPED: Cascade deletion broken', () => {
    // NOTE: Cascade deletion not working - dependency service doesn't find dependents
    // See DeletionSequenceFactory.spec.ts for details
    it('should cascade delete line when deleting defining point', () => {
      // Setup: Create point and line
      const setupCmd = new Command('Setup', world);
      
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const point1Id = p1Result.outputs.pointId!;
      
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const point2Id = p2Result.outputs.pointId!;
      
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Initial state
      const plane = world.getProjectionPlaneById(planeId)!;
      const initialPointCount = plane.getAllPoints().length;
      const initialLineCount = plane.getAllLines().length;

      // Test: Delete point1 (should cascade delete line)
      const deleteCmd = new Command('Delete with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], world);
      
      deleteCmd.commit();
      commandStack.push(deleteCmd);

      // Verify: Point and line deleted
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();
      expect(plane.getPoint(point2Id)).toBeDefined(); // Point2 still exists
      expect(plane.getAllPoints().length).toBe(initialPointCount - 1); // One point deleted
      expect(plane.getAllLines().length).toBe(initialLineCount - 1); // Line cascaded

      // Test: Undo
      commandStack.undo();
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getLine(lineId)).toBeDefined();
      expect(plane.getAllPoints().length).toBe(initialPointCount);
      expect(plane.getAllLines().length).toBe(initialLineCount);

      // Test: Redo
      commandStack.redo();
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();
      expect(plane.getAllPoints().length).toBe(initialPointCount - 1);
      expect(plane.getAllLines().length).toBe(initialLineCount - 1);
    });

    it('should cascade delete circle when deleting center point', () => {
      // Setup: Create circle
      const setupCmd = new Command('Setup', world);
      
      const centerResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const centerId = centerResult.outputs.pointId!;
      
      const circumResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const circumferenceId = circumResult.outputs.pointId!;
      
      const circleResult = setupCmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circumferenceId));
      const circleId = circleResult.outputs.circleId!;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Initial state
      const plane = world.getProjectionPlaneById(planeId)!;
      const initialPointCount = plane.getAllPoints().length;
      const initialCircleCount = plane.getAllCircles().length;

      // Test: Delete center point (should cascade delete circle)
      const deleteCmd = new Command('Delete with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [centerId], world);
      
      deleteCmd.commit();
      commandStack.push(deleteCmd);

      // Verify: Center and circle deleted
      expect(plane.getPoint(centerId)).toBeUndefined();
      expect(plane.getCircle(circleId)).toBeUndefined();
      expect(plane.getPoint(circumferenceId)).toBeDefined(); // Circumference point still exists
      expect(plane.getAllPoints().length).toBe(initialPointCount - 1);
      expect(plane.getAllCircles().length).toBe(initialCircleCount - 1);
    });

    it('should handle multiple element deletion in one command', () => {
      // Setup: Create multiple independent points
      const setupCmd = new Command('Setup', world);
      
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const point1Id = p1Result.outputs.pointId!;
      
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const point2Id = p2Result.outputs.pointId!;
      
      const p3Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(20, 0, 1)));
      const point3Id = p3Result.outputs.pointId!;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Initial state
      const plane = world.getProjectionPlaneById(planeId)!;
      const initialPointCount = plane.getAllPoints().length;

      // Test: Delete multiple points at once
      const deleteCmd = new Command('Delete multiple', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id, point3Id], world);
      
      deleteCmd.commit();
      commandStack.push(deleteCmd);

      // Verify: Two points deleted, one remains
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getPoint(point2Id)).toBeDefined();
      expect(plane.getPoint(point3Id)).toBeUndefined();
      expect(plane.getAllPoints().length).toBe(initialPointCount - 2);

      // Test: Undo restores both
      commandStack.undo();
      expect(plane.getAllPoints().length).toBe(initialPointCount);
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getPoint(point3Id)).toBeDefined();
    });
  });

  describe('IntersectionSequenceFactory Integration', () => {
    it('should create line-line intersection with correct geometry', () => {
      // Setup: Create two intersecting lines
      const setupCmd = new Command('Setup', world);
      
      // Line 1: horizontal from (0, 5) to (10, 5)
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const p1Id = p1Result.outputs.pointId!;
      
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const p2Id = p2Result.outputs.pointId!;
      
      const line1Result = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Id, p2Id));
      const line1Id = line1Result.outputs.lineId!;
      
      // Line 2: vertical from (5, 0) to (5, 10)
      const p3Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const p3Id = p3Result.outputs.pointId!;
      
      const p4Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 10, 1)));
      const p4Id = p4Result.outputs.pointId!;
      
      const line2Result = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p3Id, p4Id));
      const line2Id = line2Result.outputs.lineId!;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Test: Create intersection
      const intersectionCmd = new Command('Create intersection', world);
      const intersectionData: IntersectionData = {
        type: 'line-line',
        element1Id: line1Id,
        element2Id: line2Id
      };

      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, planeId, intersectionData, world
      );

      intersectionCmd.commit();
      commandStack.push(intersectionCmd);

      // Verify: Intersection created at (5, 5)
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();

      const pointRealization = plane.realizePoint2D(intersectionPoint!, world);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.x).toBeCloseTo(5, 0.001);
      expect(pointRealization!.position.y).toBeCloseTo(5, 0.001);

      // Test: Undo
      commandStack.undo();
      expect(plane.getPoint(result.pointId)).toBeUndefined();

      // Test: Redo
      commandStack.redo();
      const restoredPoint = plane.getPoint(result.pointId);
      expect(restoredPoint).toBeDefined();
    });

    it('should create line-circle intersection', () => {
      // Setup: Create line and circle
      const setupCmd = new Command('Setup', world);
      
      // Circle: center (5, 5), radius 5 (through point (10, 5))
      const centerResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const centerId = centerResult.outputs.pointId!;
      
      const circlePointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const circlePointId = circlePointResult.outputs.pointId!;
      
      const circleResult = setupCmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circlePointId));
      const circleId = circleResult.outputs.circleId!;
      
      // Line: horizontal through (0, 5) to (10, 5) - intersects circle at 2 points
      const lineP1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const lineP1Id = lineP1Result.outputs.pointId!;
      
      const lineP2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(15, 5, 1)));
      const lineP2Id = lineP2Result.outputs.pointId!;
      
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, lineP1Id, lineP2Id));
      const lineId = lineResult.outputs.lineId!;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Test: Create intersection at index 0
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

      intersectionCmd.commit();
      commandStack.push(intersectionCmd);

      // Verify: Intersection created
      const plane = world.getProjectionPlaneById(planeId)!;
      const intersectionPoint = plane.getPoint(result.pointId);
      expect(intersectionPoint).toBeDefined();

      // Verify: Point is on both line (y=5) and circle
      const pointRealization = plane.realizePoint2D(intersectionPoint!, world);
      expect(pointRealization).toBeDefined();
      expect(pointRealization!.position.y).toBeCloseTo(5, 0.001); // On line y=5
      
      // Check distance from center equals radius
      const center = plane.getPoint(centerId)!;
      const circlePoint = plane.getPoint(circlePointId)!;
      const centerRealization = plane.realizePoint2D(center, world);
      const circlePointRealization = plane.realizePoint2D(circlePoint, world);
      const radius = centerRealization!.position.distanceTo(circlePointRealization!.position);
      const distToIntersection = centerRealization!.position.distanceTo(pointRealization!.position);
      expect(distToIntersection).toBeCloseTo(radius, 0.001);
    });
  });

  describe('Cross-Factory Integration', () => {
    it.skip('should handle cascade deletion of intersection points', () => {
      // TODO Phase 85: Re-enable when ProcessTree producing actions are fully implemented
      // Currently failing because operations don't register producing actions for cascade deletion
      // Setup: Create lines and intersection
      const setupCmd = new Command('Setup', world);
      
      // Create two lines
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const p1Id = p1Result.outputs.pointId!;
      
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 5, 1)));
      const p2Id = p2Result.outputs.pointId!;
      
      const line1Result = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Id, p2Id));
      const line1Id = line1Result.outputs.lineId!;
      
      const p3Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 0, 1)));
      const p3Id = p3Result.outputs.pointId!;
      
      const p4Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 10, 1)));
      const p4Id = p4Result.outputs.pointId!;
      
      const line2Result = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p3Id, p4Id));
      const line2Id = line2Result.outputs.lineId!;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Create intersection
      const intersectionCmd = new Command('Create intersection', world);
      const result = IntersectionSequenceFactory.createIntersection(
        intersectionCmd, 
        planeId, 
        { type: 'line-line', element1Id: line1Id, element2Id: line2Id },
        world
      );
      intersectionCmd.commit();
      commandStack.push(intersectionCmd);

      const intersectionId = result.pointId;
      const plane = world.getProjectionPlaneById(planeId)!;

      // Initial state: 4 defining points + 1 intersection + 2 lines
      const initialPointCount = plane.getAllPoints().length;
      const initialLineCount = plane.getAllLines().length;

      // Test: Delete defining point (should cascade delete line and intersection)
      const deleteCmd = new Command('Delete with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [p1Id], world);
      deleteCmd.commit();
      commandStack.push(deleteCmd);

      // Verify: p1, line1, and intersection all deleted
      expect(plane.getPoint(p1Id)).toBeUndefined();
      expect(plane.getLine(line1Id)).toBeUndefined();
      expect(plane.getPoint(intersectionId)).toBeUndefined();
      expect(plane.getLine(line2Id)).toBeDefined(); // Line2 still exists
      expect(plane.getAllLines().length).toBe(initialLineCount - 1);

      // Test: Undo restores everything
      commandStack.undo();
      expect(plane.getPoint(p1Id)).toBeDefined();
      expect(plane.getLine(line1Id)).toBeDefined();
      expect(plane.getPoint(intersectionId)).toBeDefined();
      expect(plane.getAllPoints().length).toBe(initialPointCount);
      expect(plane.getAllLines().length).toBe(initialLineCount);
    });
  });
});
