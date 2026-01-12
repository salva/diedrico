/**
 * Unit Tests: RemoveElement Operations
 * 
 * Tests for element removal operations (T286, T290):
 * - RemovePoint2DOp, RemoveLine2DOp, RemoveSegment2DOp, RemoveCircle2DOp, RemoveGuide2DOp
 * - Undo/redo support via restore methods
 * - Integration with Command composition for cascade deletion
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T285-T290
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { RemovePoint2DOp, RemoveLine2DOp } from '@/commands/operations/world/RemoveElementOps';
import { RemoveActionFromProcessTreeOp } from '@/commands/operations/processTree/ProcessTreeOperations';
import { Command } from '@/commands/Command';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import type { Action } from '@/domain/processTree/Action';
import { getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('RemoveElement Operations (T286, T290)', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
  });

  /**
   * Helper: Add an action to the process tree for testing
   */
  function addTestAction(actionId: string, inputs: string[], outputs: string[]): void {
    const action: Action = {
      id: actionId,
      type: 'action',
      actionType: 'CreateFreePoint',
      timestamp: new Date(),
      inputs,
      outputs,
      parameters: {},
      description: `Test action ${actionId}`
    };
    world.getProcessTree().addAction(action);
  }

  describe('RemovePoint2DOp', () => {
    it('should remove a point from World', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const point = plane.addFreePoint2D(new Vector3(100, 200, 1), world);
      expect(plane.getPoint(point.id)).toBeDefined();
      
      const removeOp = new RemovePoint2DOp(planeId, point.id);
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(true);
      expect(plane.getPoint(point.id)).toBeUndefined();
    });

    it('should support undo to restore point', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const point = plane.addFreePoint2D(new Vector3(100, 200, 1), world);
      
      const removeOp = new RemovePoint2DOp(planeId, point.id);
      removeOp.apply(world);
      expect(plane.getPoint(point.id)).toBeUndefined();
      
      removeOp.undo(world);
      expect(plane.getPoint(point.id)).toBeDefined();
    });

    it('should return error when point not found', () => {
      const planeId = getHorizontalPlaneId(world);
      const removeOp = new RemovePoint2DOp(planeId, 'nonexistent');
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('RemoveLine2DOp', () => {
    it('should remove a line from World', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      expect(plane.getLine(line.id)).toBeDefined();
      
      const removeOp = new RemoveLine2DOp(planeId, line.id);
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(true);
      expect(plane.getLine(line.id)).toBeUndefined();
    });

    it('should support undo to restore line', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      const removeOp = new RemoveLine2DOp(planeId, line.id);
      removeOp.apply(world);
      expect(plane.getLine(line.id)).toBeUndefined();
      
      removeOp.undo(world);
      expect(plane.getLine(line.id)).toBeDefined();
    });
  });

  describe('Command composition for cascade deletion', () => {
    it('should delete point and dependent line using Command', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      // Create point → line dependency
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      // Add actions to process tree
      addTestAction('action1', [], [p1.id]);
      addTestAction('action2', [], [p2.id]);
      addTestAction('action3', [p1.id, p2.id], [line.id]);
      
      world.getDependencyService().rebuildDependencyMaps();
      
      // Build delete command with cascade
      const deleteCmd = new Command('Delete point with cascade', world);
      
      // Remove dependent line first
      deleteCmd.addAndExecute(new RemoveLine2DOp(planeId, line.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action3'));
      
      // Then remove point
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      // Verify both deleted
      expect(plane.getPoint(p1.id)).toBeUndefined();
      expect(plane.getLine(line.id)).toBeUndefined();
      expect(plane.getPoint(p2.id)).toBeDefined(); // p2 should remain
    });

    it('should support undo for cascade deletion', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      addTestAction('action1', [], [p1.id]);
      addTestAction('action2', [], [p2.id]);
      addTestAction('action3', [p1.id, p2.id], [line.id]);
      
      const deleteCmd = new Command('Delete with cascade', world);
      deleteCmd.addAndExecute(new RemoveLine2DOp(planeId, line.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action3'));
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      // Verify deleted
      expect(plane.getPoint(p1.id)).toBeUndefined();
      expect(plane.getLine(line.id)).toBeUndefined();
      
      // Undo - both should be restored
      commandStack.undo();
      expect(plane.getPoint(p1.id)).toBeDefined();
      expect(plane.getLine(line.id)).toBeDefined();
    });

    it('should support redo after undo', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      addTestAction('action1', [], [p1.id]);
      addTestAction('action2', [], [p2.id]);
      addTestAction('action3', [p1.id, p2.id], [line.id]);
      
      const deleteCmd = new Command('Delete', world);
      deleteCmd.addAndExecute(new RemoveLine2DOp(planeId, line.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action3'));
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      // Undo then redo
      commandStack.undo();
      expect(plane.getPoint(p1.id)).toBeDefined();
      expect(plane.getLine(line.id)).toBeDefined();
      
      commandStack.redo();
      expect(plane.getPoint(p1.id)).toBeUndefined();
      expect(plane.getLine(line.id)).toBeUndefined();
    });
  });

  describe('Multiple elements deletion', () => {
    it('should delete multiple independent points', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world);
      
      addTestAction('action1', [], [p1.id]);
      addTestAction('action2', [], [p2.id]);
      
      const deleteCmd = new Command('Delete multiple points', world);
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p2.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action2'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      expect(plane.getPoint(p1.id)).toBeUndefined();
      expect(plane.getPoint(p2.id)).toBeUndefined();
    });
  });
});
