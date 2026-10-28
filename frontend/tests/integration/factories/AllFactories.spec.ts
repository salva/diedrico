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
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { Command } from '@/commands/Command';
import {
  createTestWorld,
  getHalfHingeLines2D,
  getHorizontalPlane,
  getHorizontalPlaneId,
  getVerticalPlane,
} from '../../helpers/worldHelpers';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { DeletionSequenceFactory } from '@/commands/factories/DeletionSequenceFactory';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { Vector3 } from 'three';

describe('Factory Integration Tests', () => {
  let world: World;
  let visibilityModel;
  let commandStack: CommandStack;
  let operationContext: OperationContext;
  let planeId: string;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, commandStack: cs, operationContext: oc } = createTestWorld();
    world = w;

    visibilityModel = vm;    commandStack = cs;
    operationContext = oc;
    planeId = getHorizontalPlaneId(world);
  });

  function deletionContext() {
    return {
      world,
      dependencyQuery: operationContext.dependencies,
      processTree: operationContext.processTree,
    };
  }

  describe('GuideSequenceFactory Integration', () => {
    it('should create guide with sibling on HHL and support undo/redo', () => {
      // Setup: Use existing HHL (created by default in World)
      const setupCmd = new Command('Setup', operationContext);
      
      // Use the default HHL that exists in every World
      const hhlId = getHalfHingeLines2D(world, planeId)[0].id;
      
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
      const guideCmd = new Command('Create guide', operationContext);
      const result = GuideSequenceFactory.createGuideWithSibling(
        guideCmd, planeId, hhlId, throughPointId, world, operationContext.realizationContext
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

    it.skip('legacy regular-line guide fixture selects bootstrap points by array index', () => {
      // Setup: Create regular line
      const setupCmd = new Command('Setup line', operationContext);
      
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
      const guideCmd = new Command('Create guide', operationContext);
      const result = GuideSequenceFactory.createGuideWithSibling(
        guideCmd, planeId, lineId, throughPointId, world, operationContext.realizationContext
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

  describe.skip('DeletionSequenceFactory Integration - legacy fixtures omit producing actions', () => {
    // Current deletion requires process-tree producing actions; exercised by SelectionDeletionCommandService tests.
    it('should cascade delete line when deleting defining point', () => {
      // Setup: Create point and line
      const setupCmd = new Command('Setup', operationContext);
      
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
      const deleteCmd = new Command('Delete with cascade', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], deletionContext());
      
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
      const setupCmd = new Command('Setup', operationContext);
      
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
      const deleteCmd = new Command('Delete with cascade', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [centerId], deletionContext());
      
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
      const setupCmd = new Command('Setup', operationContext);
      
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
      const deleteCmd = new Command('Delete multiple', operationContext);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id, point3Id], deletionContext());
      
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
});
