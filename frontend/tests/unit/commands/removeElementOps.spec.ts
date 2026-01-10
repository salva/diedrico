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

describe('RemoveElement Operations (T286, T290)', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    world = new World();
    world.initializeFixedElements();
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
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const point = plane.addFreePoint2D(new Vector3(100, 200, 1), world, 'point1');
      expect(plane.getPoint('point1')).toBeDefined();
      
      const removeOp = new RemovePoint2DOp('proj_plane_H', 'point1');
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(true);
      expect(plane.getPoint('point1')).toBeUndefined();
    });

    it('should support undo to restore point', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const point = plane.addFreePoint2D(new Vector3(100, 200, 1), world, 'point1');
      
      const removeOp = new RemovePoint2DOp('proj_plane_H', 'point1');
      removeOp.apply(world);
      expect(plane.getPoint('point1')).toBeUndefined();
      
      removeOp.undo(world);
      expect(plane.getPoint('point1')).toBeDefined();
    });

    it('should return error when point not found', () => {
      const removeOp = new RemovePoint2DOp('proj_plane_H', 'nonexistent');
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('RemoveLine2DOp', () => {
    it('should remove a line from World', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world, 'p1');
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world, 'p2');
      const line = plane.addLine2DBetweenTwoPoints('p1', 'p2', world, 'line1');
      
      expect(plane.getLine('line1')).toBeDefined();
      
      const removeOp = new RemoveLine2DOp('proj_plane_H', 'line1');
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(true);
      expect(plane.getLine('line1')).toBeUndefined();
    });

    it('should support undo to restore line', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world, 'p1');
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world, 'p2');
      const line = plane.addLine2DBetweenTwoPoints('p1', 'p2', world, 'line1');
      
      const removeOp = new RemoveLine2DOp('proj_plane_H', 'line1');
      removeOp.apply(world);
      expect(plane.getLine('line1')).toBeUndefined();
      
      removeOp.undo(world);
      expect(plane.getLine('line1')).toBeDefined();
    });
  });

  describe('Command composition for cascade deletion', () => {
    it('should delete point and dependent line using Command', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      // Create point → line dependency
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world, 'p1');
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world, 'p2');
      const line = plane.addLine2DBetweenTwoPoints('p1', 'p2', world, 'line1');
      
      // Add actions to process tree
      addTestAction('action1', [], ['p1']);
      addTestAction('action2', [], ['p2']);
      addTestAction('action3', ['p1', 'p2'], ['line1']);
      
      world.getDependencyService().rebuildDependencyMaps();
      
      // Build delete command with cascade
      const deleteCmd = new Command('Delete point with cascade', world);
      
      // Remove dependent line first
      deleteCmd.addAndExecute(new RemoveLine2DOp('proj_plane_H', 'line1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action3'));
      
      // Then remove point
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      // Verify both deleted
      expect(plane.getPoint('p1')).toBeUndefined();
      expect(plane.getLine('line1')).toBeUndefined();
      expect(plane.getPoint('p2')).toBeDefined(); // p2 should remain
    });

    it('should support undo for cascade deletion', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world, 'p1');
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world, 'p2');
      const line = plane.addLine2DBetweenTwoPoints('p1', 'p2', world, 'line1');
      
      addTestAction('action1', [], ['p1']);
      addTestAction('action2', [], ['p2']);
      addTestAction('action3', ['p1', 'p2'], ['line1']);
      
      const deleteCmd = new Command('Delete with cascade', world);
      deleteCmd.addAndExecute(new RemoveLine2DOp('proj_plane_H', 'line1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action3'));
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      // Verify deleted
      expect(plane.getPoint('p1')).toBeUndefined();
      expect(plane.getLine('line1')).toBeUndefined();
      
      // Undo - both should be restored
      commandStack.undo();
      expect(plane.getPoint('p1')).toBeDefined();
      expect(plane.getLine('line1')).toBeDefined();
    });

    it('should support redo after undo', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world, 'p1');
      const p2 = plane.addFreePoint2D(new Vector3(100, 100, 1), world, 'p2');
      const line = plane.addLine2DBetweenTwoPoints('p1', 'p2', world, 'line1');
      
      addTestAction('action1', [], ['p1']);
      addTestAction('action2', [], ['p2']);
      addTestAction('action3', ['p1', 'p2'], ['line1']);
      
      const deleteCmd = new Command('Delete', world);
      deleteCmd.addAndExecute(new RemoveLine2DOp('proj_plane_H', 'line1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action3'));
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      // Undo then redo
      commandStack.undo();
      expect(plane.getPoint('p1')).toBeDefined();
      expect(plane.getLine('line1')).toBeDefined();
      
      commandStack.redo();
      expect(plane.getPoint('p1')).toBeUndefined();
      expect(plane.getLine('line1')).toBeUndefined();
    });
  });

  describe('Multiple elements deletion', () => {
    it('should delete multiple independent points', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      plane.addFreePoint2D(new Vector3(0, 0, 1), world, 'p1');
      plane.addFreePoint2D(new Vector3(100, 100, 1), world, 'p2');
      
      addTestAction('action1', [], ['p1']);
      addTestAction('action2', [], ['p2']);
      
      const deleteCmd = new Command('Delete multiple points', world);
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p2'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action2'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      expect(plane.getPoint('p1')).toBeUndefined();
      expect(plane.getPoint('p2')).toBeUndefined();
    });
  });
});
