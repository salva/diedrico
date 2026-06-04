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
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import { createTestWorld } from '../../helpers/worldHelpers';
import type { Action } from '@/domain/processTree/Action';
import type { ActionGroup } from '@/domain/processTree/ProcessTree';
import { getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('RemoveElement Operations (T286, T290)', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    const { world: w, commandStack: cs } = createTestWorld();
    world = w;
    commandStack = cs;
  });

  /**
   * Helper: Add an action to the process tree for testing
   * Phase 93: Actions simplified - only have elementId, description, isOutput
   */
  function addTestAction(elementId: string): string {
    const action: Action = {
      elementId,
      description: `Test action for ${elementId}`,
      isOutput: true
    };
    const processTree = world.getProcessTree();
    const actionGroup: ActionGroup = {
      id: `test-group-${elementId}`,
      type: 'actionGroup',
      children: [],
      isAuxiliary: false,
      isOutput: true,
      created: new Date()
    };
    processTree.addActionGroup(actionGroup);
    const index = processTree.addActionToGroup(action, actionGroup.id);
    const actionNode = actionGroup.children[index];
    if (!actionNode) {
      throw new Error('Failed to insert test action');
    }
    // Return the ActionNode ID (not Action ID, which doesn't exist)
    return actionNode.id;
  }

  function addFreePoint(plane: ReturnType<typeof getHorizontalPlane>, position: Vector3) {
    return world.getConstructionService().addFreePoint2D(plane, position);
  }

  function addLineByPoints(plane: ReturnType<typeof getHorizontalPlane>, point1Id: string, point2Id: string) {
    return world.getConstructionService().addLine2DBetweenTwoPoints(plane, point1Id, point2Id);
  }

  describe('RemovePoint2DOp', () => {
    it('should remove a point from World', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const point = addFreePoint(plane, new Vector3(100, 200, 1));
      expect(plane.getPoint(point.id)).toBeDefined();
      
      const removeOp = new RemovePoint2DOp(planeId, point.id);
      const result = removeOp.apply({ world });
      
      expect(result.success).toBe(true);
      expect(plane.getPoint(point.id)).toBeUndefined();
    });

    it('should support undo to restore point', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const point = addFreePoint(plane, new Vector3(100, 200, 1));
      
      const removeOp = new RemovePoint2DOp(planeId, point.id);
      removeOp.apply({ world });
      expect(plane.getPoint(point.id)).toBeUndefined();
      
      removeOp.undo({ world });
      expect(plane.getPoint(point.id)).toBeDefined();
    });

    it('should return error when point not found', () => {
      const planeId = getHorizontalPlaneId(world);
      const removeOp = new RemovePoint2DOp(planeId, 'nonexistent');
      const result = removeOp.apply({ world });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('RemoveLine2DOp', () => {
    it('should remove a line from World', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = addFreePoint(plane, new Vector3(0, 0, 1));
      const p2 = addFreePoint(plane, new Vector3(100, 100, 1));
      const line = addLineByPoints(plane, p1.id, p2.id);
      
      expect(plane.getLine(line.id)).toBeDefined();
      
      const removeOp = new RemoveLine2DOp(planeId, line.id);
      const result = removeOp.apply({ world });
      
      expect(result.success).toBe(true);
      expect(plane.getLine(line.id)).toBeUndefined();
    });

    it('should support undo to restore line', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p1 = addFreePoint(plane, new Vector3(0, 0, 1));
      const p2 = addFreePoint(plane, new Vector3(100, 100, 1));
      const line = addLineByPoints(plane, p1.id, p2.id);
      
      const removeOp = new RemoveLine2DOp(planeId, line.id);
      removeOp.apply({ world });
      expect(plane.getLine(line.id)).toBeUndefined();
      
      removeOp.undo({ world });
      expect(plane.getLine(line.id)).toBeDefined();
    });
  });

  describe('Command composition for cascade deletion', () => {
    it('should delete point and dependent line using Command', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      // Create point → line dependency
      const p1 = addFreePoint(plane, new Vector3(0, 0, 1));
      const p2 = addFreePoint(plane, new Vector3(100, 100, 1));
      const line = addLineByPoints(plane, p1.id, p2.id);
      
      // Add actions to process tree - Phase 93: addTestAction returns ActionNode ID
      const actionNode1 = addTestAction(p1.id);
      const actionNode2 = addTestAction(p2.id);
      const actionNode3 = addTestAction(line.id);
      
      world.getDependencyRegistrar().registerNode(line.id, [p1.id, p2.id]);
      
      // Build delete command with cascade
      const deleteCmd = new Command('Delete point with cascade', { world });
      
      // Remove dependent line first
      deleteCmd.addAndExecute(new RemoveLine2DOp(planeId, line.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode3));
      
      // Then remove point
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode1));
      
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
      const p1 = addFreePoint(plane, new Vector3(0, 0, 1));
      const p2 = addFreePoint(plane, new Vector3(100, 100, 1));
      const line = addLineByPoints(plane, p1.id, p2.id);
      
      // Phase 93: addTestAction returns ActionNode ID
      const actionNode1 = addTestAction(p1.id);
      const actionNode2 = addTestAction(p2.id);
      const actionNode3 = addTestAction(line.id);
      
      const deleteCmd = new Command('Delete with cascade', { world });
      deleteCmd.addAndExecute(new RemoveLine2DOp(planeId, line.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode3));
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode1));
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
      const p1 = addFreePoint(plane, new Vector3(0, 0, 1));
      const p2 = addFreePoint(plane, new Vector3(100, 100, 1));
      const line = addLineByPoints(plane, p1.id, p2.id);
      
      // Phase 93: addTestAction returns ActionNode ID
      const actionNode1 = addTestAction(p1.id);
      const actionNode2 = addTestAction(p2.id);
      const actionNode3 = addTestAction(line.id);
      
      const deleteCmd = new Command('Delete', { world });
      deleteCmd.addAndExecute(new RemoveLine2DOp(planeId, line.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode3));
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode1));
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
      const p1 = addFreePoint(plane, new Vector3(0, 0, 1));
      const p2 = addFreePoint(plane, new Vector3(100, 100, 1));
      
      // Phase 93: addTestAction returns ActionNode ID
      const actionNode1 = addTestAction(p1.id);
      const actionNode2 = addTestAction(p2.id);
      
      const deleteCmd = new Command('Delete two points', { world });
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode1));
      deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p2.id));
      deleteCmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionNode2));
      deleteCmd.commit();
      commandStack.push(deleteCmd);
      
      expect(plane.getPoint(p1.id)).toBeUndefined();
      expect(plane.getPoint(p2.id)).toBeUndefined();
    });
  });
});
