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
import { RemovePoint2DOp, RemoveLine2DOp } from '@/commands/operations/RemoveElementOps';
import { RemoveActionFromProcessTreeOp } from '@/commands/operations/ProcessTreeOperations';
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
      const point = world.addFreePoint2D('proj_plane_H', new Vector3(100, 200, 1), 'point1');
      expect(world.getPoint2DById('point1')).toBeDefined();
      
      const removeOp = new RemovePoint2DOp('proj_plane_H', 'point1');
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(true);
      expect(world.getPoint2DById('point1')).toBeUndefined();
    });

    it('should support undo to restore point', () => {
      const point = world.addFreePoint2D('proj_plane_H', new Vector3(100, 200, 1), 'point1');
      
      const removeOp = new RemovePoint2DOp('proj_plane_H', 'point1');
      removeOp.apply(world);
      expect(world.getPoint2DById('point1')).toBeUndefined();
      
      removeOp.undo(world);
      expect(world.getPoint2DById('point1')).toBeDefined();
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
      const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(100, 100, 1), 'p2');
      const line = world.addLine2DBetweenTwoPoints('proj_plane_H', 'p1', 'p2', 'line1');
      
      expect(world.getLine2DById('line1')).toBeDefined();
      
      const removeOp = new RemoveLine2DOp('proj_plane_H', 'line1');
      const result = removeOp.apply(world);
      
      expect(result.success).toBe(true);
      expect(world.getLine2DById('line1')).toBeUndefined();
    });

    it('should support undo to restore line', () => {
      const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(100, 100, 1), 'p2');
      const line = world.addLine2DBetweenTwoPoints('proj_plane_H', 'p1', 'p2', 'line1');
      
      const removeOp = new RemoveLine2DOp('proj_plane_H', 'line1');
      removeOp.apply(world);
      expect(world.getLine2DById('line1')).toBeUndefined();
      
      removeOp.undo(world);
      expect(world.getLine2DById('line1')).toBeDefined();
    });
  });

  describe('Command composition for cascade deletion', () => {
    it('should delete point and dependent line using Command', () => {
      // Create point → line dependency
      const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(100, 100, 1), 'p2');
      const line = world.addLine2DBetweenTwoPoints('proj_plane_H', 'p1', 'p2', 'line1');
      
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
      expect(world.getPoint2DById('p1')).toBeUndefined();
      expect(world.getLine2DById('line1')).toBeUndefined();
      expect(world.getPoint2DById('p2')).toBeDefined(); // p2 should remain
    });

    it('should support undo for cascade deletion', () => {
      const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(100, 100, 1), 'p2');
      const line = world.addLine2DBetweenTwoPoints('proj_plane_H', 'p1', 'p2', 'line1');
      
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
      expect(world.getPoint2DById('p1')).toBeUndefined();
      expect(world.getLine2DById('line1')).toBeUndefined();
      
      // Undo - both should be restored
      commandStack.undo();
      expect(world.getPoint2DById('p1')).toBeDefined();
      expect(world.getLine2DById('line1')).toBeDefined();
    });

    it('should support redo after undo', () => {
      const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
      const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(100, 100, 1), 'p2');
      const line = world.addLine2DBetweenTwoPoints('proj_plane_H', 'p1', 'p2', 'line1');
      
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
      expect(world.getPoint2DById('p1')).toBeDefined();
      expect(world.getLine2DById('line1')).toBeDefined();
      
      commandStack.redo();
      expect(world.getPoint2DById('p1')).toBeUndefined();
      expect(world.getLine2DById('line1')).toBeUndefined();
    });
  });

  describe('Multiple elements deletion', () => {
    it('should delete multiple independent points', () => {
      world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
      world.addFreePoint2D('proj_plane_H', new Vector3(100, 100, 1), 'p2');
      
      addTestAction('action1', [], ['p1']);
      addTestAction('action2', [], ['p2']);
      
      const deleteCmd = new Command('Delete multiple points', world);
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p1'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action1'));
      deleteCmd.addAndExecute(new RemovePoint2DOp('proj_plane_H', 'p2'));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp('action2'));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      expect(world.getPoint2DById('p1')).toBeUndefined();
      expect(world.getPoint2DById('p2')).toBeUndefined();
    });
  });
});
