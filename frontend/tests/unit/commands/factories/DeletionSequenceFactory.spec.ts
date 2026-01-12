/**
 * DeletionSequenceFactory.spec.ts - Unit tests for DeletionSequenceFactory
 * 
 * Tests the cascade deletion logic extracted from App.vue:
 * - Single element deletion (no dependencies)
 * - Cascade deletion (element with dependents)
 * - Process tree action cleanup
 * - Multiple element deletion
 * 
 * Phase 43 - T482
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '../../../../src/domain/world/World';
import { Command } from '../../../../src/commands/Command';
import { CommandStack } from '../../../../src/commands/CommandStack';
import { DeletionSequenceFactory } from '../../../../src/commands/factories/DeletionSequenceFactory';
import { AddFreePoint2DOp } from '../../../../src/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '../../../../src/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '../../../../src/commands/operations/world/AddCircleOp';
import { AddSegment2DByPointsOp } from '../../../../src/commands/operations/world/AddSegmentOp';
import { createPointAction } from '../../../../src/domain/processTree/actions/CreatePointAction';
import { createLineAction } from '../../../../src/domain/processTree/actions/CreateLineAction';
import { createCircleAction } from '../../../../src/domain/processTree/actions/CreateCircleAction';

describe('DeletionSequenceFactory', () => {
  let world: World;
  let commandStack: CommandStack;
  let planeId: string; // Will be set dynamically in beforeEach

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
    // Get actual plane ID from initialized world
    planeId = world.getProjectionPlaneByLabel('P_H').id!;
  });

  describe('createCascadeDeletion', () => {
    it('should delete single point with no dependencies', () => {
      const cmd = new Command('Setup', world);
      
      // Create a free point
      const pointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      
      // Record in process tree
      const action = createPointAction(pointId, new Vector3(100, 200, 1), 'free', planeId);
      world.getProcessTree().addAction(action);
      cmd.commit();

      // Create deletion command
      const deleteCmd = new Command('Delete point', world);
      const opCountBefore = deleteCmd.operations.length;
      
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], world);
      deleteCmd.commit();

      // Verify point removed
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(pointId)).toBeUndefined();
      
      // Verify operations added (1 RemovePoint + 1 RemoveAction)
      expect(deleteCmd.operations.length).toBe(opCountBefore + 2);
    });

    it('should cascade delete line when deleting its defining point', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create two points and a line
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      // Record in process tree
      world.getProcessTree().addAction(createPointAction(point1Id, new Vector3(100, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(point2Id, new Vector3(300, 400, 1), 'free', planeId));
      world.getProcessTree().addAction(createLineAction(lineId, point1Id, point2Id, planeId));

      setupCmd.commit();

      // Build dependency maps
      world.getDependencyService().rebuildDependencyMaps();

      // Delete point1 (should cascade to line)
      const deleteCmd = new Command('Delete point', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], world);
      deleteCmd.commit();

      // Verify cascade deletion
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();
      
      // Point2 should still exist (not selected)
      expect(plane.getPoint(point2Id)).toBeDefined();
      
      // Should have operations for: line, point1, and their actions (>2)
      expect(deleteCmd.operations.length).toBeGreaterThan(2);
    });

    it('should delete circle and its dependent elements', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create center point, circumference point, and circle
      const centerResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const circumResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 200, 1)));
      const centerId = centerResult.outputs.pointId!;
      const circumId = circumResult.outputs.pointId!;
      
      const circleResult = setupCmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerId, circumId));
      const circleId = circleResult.outputs.circleId!;

      // Record in process tree
      world.getProcessTree().addAction(createPointAction(centerId, new Vector3(200, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(circumId, new Vector3(300, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createCircleAction(circleId, centerId, circumId, planeId));

      setupCmd.commit();

      // Build dependency maps
      world.getDependencyService().rebuildDependencyMaps();

      // Delete center point (should cascade to circle)
      const deleteCmd = new Command('Delete center', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [centerId], world);
      deleteCmd.commit();

      // Verify cascade deletion
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(centerId)).toBeUndefined();
      expect(plane.getCircle(circleId)).toBeUndefined();
      
      // Circumference point should still exist
      expect(plane.getPoint(circumId)).toBeDefined();
    });

    it('should handle deletion order correctly (dependents before dependencies)', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create chain: point1 -> line
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      // Record in process tree
      world.getProcessTree().addAction(createPointAction(point1Id, new Vector3(100, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(point2Id, new Vector3(300, 400, 1), 'free', planeId));
      world.getProcessTree().addAction(createLineAction(lineId, point1Id, point2Id, planeId));

      setupCmd.commit();

      // Build dependency maps
      world.getDependencyService().rebuildDependencyMaps();

      // Delete point1
      const deleteCmd = new Command('Delete with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], world);
      
      // Check operation order: line operations should come before point operations
      const ops = deleteCmd.operations;
      const lineOpIndex = ops.findIndex((op: any) => op.type.includes('Line'));
      const pointOpIndex = ops.findIndex((op: any) => op.type.includes('Point'));
      
      // Line should be deleted before point (dependents first)
      expect(lineOpIndex).toBeLessThan(pointOpIndex);
      
      deleteCmd.commit();
    });

    it('should remove process tree actions for deleted elements', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create point
      const pointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      
      // Record in process tree
      const action = createPointAction(pointId, new Vector3(100, 200, 1), 'free', planeId);
      world.getProcessTree().addAction(action);
      setupCmd.commit();

      // Verify action exists
      const actionsBefore = world.getProcessTree().getActionsProducingElement(pointId);
      expect(actionsBefore.length).toBe(1);

      // Delete point
      const deleteCmd = new Command('Delete point', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], world);
      deleteCmd.commit();

      // Verify action removed (tombstoned)
      const actionsAfter = world.getProcessTree().getActionsProducingElement(pointId);
      expect(actionsAfter.length).toBe(0);
    });

    it('should handle multiple element deletion in one command', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create multiple independent points
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const p3Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(500, 600, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      const point3Id = p3Result.outputs.pointId!;

      // Record in process tree
      world.getProcessTree().addAction(createPointAction(point1Id, new Vector3(100, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(point2Id, new Vector3(300, 400, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(point3Id, new Vector3(500, 600, 1), 'free', planeId));
      setupCmd.commit();

      // Delete all three points
      const deleteCmd = new Command('Delete multiple', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id, point2Id, point3Id], world);
      deleteCmd.commit();

      // Verify all points removed
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getPoint(point2Id)).toBeUndefined();
      expect(plane.getPoint(point3Id)).toBeUndefined();
      
      // Should have 3 RemovePoint ops + 3 RemoveAction ops
      expect(deleteCmd.operations.length).toBe(6);
    });

    it('should support undo/redo for cascade deletion', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create point and line
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      
      const lineResult = setupCmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;

      // Record in process tree
      world.getProcessTree().addAction(createPointAction(point1Id, new Vector3(100, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(point2Id, new Vector3(300, 400, 1), 'free', planeId));
      world.getProcessTree().addAction(createLineAction(lineId, point1Id, point2Id, planeId));

      setupCmd.commit();
      commandStack.push(setupCmd);

      // Build dependency maps
      world.getDependencyService().rebuildDependencyMaps();

      // Delete point1
      const deleteCmd = new Command('Delete with cascade', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [point1Id], world);
      deleteCmd.commit();
      commandStack.push(deleteCmd);

      // Verify deletion
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();

      // Undo
      commandStack.undo();

      // Verify restoration
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getLine(lineId)).toBeDefined();

      // Redo
      commandStack.redo();

      // Verify deletion again
      expect(plane.getPoint(point1Id)).toBeUndefined();
      expect(plane.getLine(lineId)).toBeUndefined();
    });

    it('should handle deletion of segment (line subtype)', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create segment
      const p1Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const p2Result = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(300, 400, 1)));
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      
      const segmentResult = setupCmd.addAndExecute(new AddSegment2DByPointsOp(planeId, point1Id, point2Id));
      const segmentId = segmentResult.outputs.segmentId!;

      // Record in process tree
      world.getProcessTree().addAction(createPointAction(point1Id, new Vector3(100, 200, 1), 'free', planeId));
      world.getProcessTree().addAction(createPointAction(point2Id, new Vector3(300, 400, 1), 'free', planeId));
      world.getProcessTree().addAction(createLineAction(segmentId, point1Id, point2Id, planeId));

      setupCmd.commit();

      // Build dependency maps
      world.getDependencyService().rebuildDependencyMaps();

      // Delete segment directly
      const deleteCmd = new Command('Delete segment', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [segmentId], world);
      deleteCmd.commit();

      // Verify segment removed
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getLine(segmentId)).toBeUndefined();
      
      // Points should still exist
      expect(plane.getPoint(point1Id)).toBeDefined();
      expect(plane.getPoint(point2Id)).toBeDefined();
      
      // Check that RemoveSegment2DOp was used (not RemoveLine2DOp)
      const ops = deleteCmd.operations;
      const segmentOp = ops.find((op: any) => op.type === 'RemoveSegment2D');
      expect(segmentOp).toBeDefined();
    });

    it('should handle empty selection gracefully', () => {
      // Create deletion command with empty array
      const deleteCmd = new Command('Delete nothing', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [], world);
      deleteCmd.commit();

      // Should have no operations
      expect(deleteCmd.operations.length).toBe(0);
    });

    it('should handle element without process tree action', () => {
      const setupCmd = new Command('Setup', world);
      
      // Create point but don't record in process tree
      const pointResult = setupCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const pointId = pointResult.outputs.pointId!;
      setupCmd.commit();

      // Delete point (no action to remove)
      const deleteCmd = new Command('Delete point', world);
      DeletionSequenceFactory.createCascadeDeletion(deleteCmd, [pointId], world);
      deleteCmd.commit();

      // Verify point removed (even without action)
      const plane = world.getProjectionPlaneById(planeId)!;
      expect(plane.getPoint(pointId)).toBeUndefined();
      
      // Should have only RemovePoint op (no RemoveAction)
      expect(deleteCmd.operations.length).toBe(1);
    });
  });
});
