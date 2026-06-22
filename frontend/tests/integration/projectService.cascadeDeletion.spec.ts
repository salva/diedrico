/**
 * Deletion Edge Case Tests for ProjectService (Phase 40 T443)
 * 
 * These tests verify that deletion operations are correctly preserved 
 * through serialization/deserialization, including edge cases.
 * 
 * Test Strategy:
 * - Create and delete elements in various orders
 * - Serialize and deserialize the project
 * - Verify deletions are preserved
 * - Test undo/redo cycles
 * 
 * Reference: Phase 40 T443 - Edge case testing for deletions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import { createTestWorld, getHorizontalPlaneId } from '../helpers/worldHelpers';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { ProjectService } from '@/application/appShell/ProjectService';
import { Vector3 } from 'three';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { RemovePoint2DOp } from '@/commands/operations/world/RemoveElementOps';

describe('ProjectService Deletion Edge Case Tests', () => {
  let world: World;
  let visibilityModel: VisibilityModel;
  let commandStack: CommandStack;
  let operationContext: ReturnType<typeof createTestWorld>['operationContext'];
  let planeId: string;

  beforeEach(() => {
    const testWorld = createTestWorld();
    world = testWorld.world;
    visibilityModel = testWorld.visibilityModel;
    commandStack = testWorld.commandStack;
    operationContext = testWorld.operationContext;
    planeId = getHorizontalPlaneId(world);
  });

  /**
   * Test deletion is preserved through serialization
   */
  it('should preserve deletion through serialization', () => {
    // Create two points
    const createCmd = new Command('Create points', operationContext);
    const p1Result = createCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
    const p2Result = createCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
    createCmd.commit();
    commandStack.push(createCmd);

    const p1Id = p1Result.outputs.pointId;
    const p2Id = p2Result.outputs.pointId;

    // Delete one point
    const deleteCmd = new Command('Delete point', operationContext);
    deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1Id));
    deleteCmd.commit();
    commandStack.push(deleteCmd);

    // Verify deletion
    let plane = world.getProjectionPlaneById(planeId)!;
    expect(plane.getPoint(p1Id)).toBeUndefined();
    expect(plane.getPoint(p2Id)).toBeDefined();

    // Serialize
    const serialized = ProjectService.serializeCommands(commandStack, operationContext.idAllocator.peek(), 'Deletion Test');

    // Deserialize into fresh World
    const { world: freshWorld, visibilityModel: freshVisibilityModel, commandStack: freshStack, operationContext: freshOperationContext } = createTestWorld();
    ProjectService.deserializeCommands(serialized, freshVisibilityModel, freshStack, freshOperationContext);

    // Verify deletion is preserved
    const freshPlane = freshWorld.getProjectionPlaneById(planeId)!;
    expect(freshPlane.getPoint(p1Id)).toBeUndefined();
    expect(freshPlane.getPoint(p2Id)).toBeDefined();

    // Test undo
    freshStack.undo();
    expect(freshPlane.getPoint(p1Id)).toBeDefined();
    expect(freshPlane.getPoint(p2Id)).toBeDefined();
  });

  /**
   * Test multiple deletions in sequence
   */
  it('should handle multiple deletions in sequence', () => {
    // Create three points
    const createCmd = new Command('Create points', operationContext);
    const p1Result = createCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
    const p2Result = createCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(50, 0, 1)));
    const p3Result = createCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
    createCmd.commit();
    commandStack.push(createCmd);

    const p1Id = p1Result.outputs.pointId;
    const p2Id = p2Result.outputs.pointId;
    const p3Id = p3Result.outputs.pointId;

    // Delete p1
    const delete1Cmd = new Command('Delete p1', operationContext);
    delete1Cmd.addAndExecute(new RemovePoint2DOp(planeId, p1Id));
    delete1Cmd.commit();
    commandStack.push(delete1Cmd);

    // Delete p3
    const delete3Cmd = new Command('Delete p3', operationContext);
    delete3Cmd.addAndExecute(new RemovePoint2DOp(planeId, p3Id));
    delete3Cmd.commit();
    commandStack.push(delete3Cmd);

    // Serialize
    const serialized = ProjectService.serializeCommands(commandStack, operationContext.idAllocator.peek(), 'Multiple Deletions');
    const { world: freshWorld, visibilityModel: freshVisibilityModel, commandStack: freshStack, operationContext: freshOperationContext } = createTestWorld();
    ProjectService.deserializeCommands(serialized, freshVisibilityModel, freshStack, freshOperationContext);

    // Verify final state
    const freshPlane = freshWorld.getProjectionPlaneById(planeId)!;
    expect(freshPlane.getPoint(p1Id)).toBeUndefined();
    expect(freshPlane.getPoint(p2Id)).toBeDefined();
    expect(freshPlane.getPoint(p3Id)).toBeUndefined();

    // Undo last deletion
    freshStack.undo();
    expect(freshPlane.getPoint(p3Id)).toBeDefined();

    // Undo first deletion
    freshStack.undo();
    expect(freshPlane.getPoint(p1Id)).toBeDefined();
  });

  /**
   * Test undo/redo cycles with deletions
   */
  it('should handle deletion through undo/redo cycles', () => {
    // Create and delete
    const createCmd = new Command('Create', operationContext);
    const pResult = createCmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(50, 50, 1)));
    createCmd.commit();
    commandStack.push(createCmd);

    const pId = pResult.outputs.pointId;

    const deleteCmd = new Command('Delete', operationContext);
    deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, pId));
    deleteCmd.commit();
    commandStack.push(deleteCmd);

    // Serialize
    const serialized = ProjectService.serializeCommands(commandStack, operationContext.idAllocator.peek(), 'Undo/Redo Test');
    const { world: freshWorld, visibilityModel: freshVisibilityModel, commandStack: freshStack, operationContext: freshOperationContext } = createTestWorld();
    ProjectService.deserializeCommands(serialized, freshVisibilityModel, freshStack, freshOperationContext);

    const freshPlane = freshWorld.getProjectionPlaneById(planeId)!;

    // Undo deletion
    freshStack.undo();
    expect(freshPlane.getPoint(pId)).toBeDefined();

    // Redo deletion
    freshStack.redo();
    expect(freshPlane.getPoint(pId)).toBeUndefined();

    // Undo again
    freshStack.undo();
    expect(freshPlane.getPoint(pId)).toBeDefined();
  });

  /**
   * Test create-delete-create with same position
   */
  it('should handle create-delete-create pattern', () => {
    const position = new Vector3(75, 75, 1);

    // Create point
    const create1Cmd = new Command('Create 1', operationContext);
    const p1Result = create1Cmd.addAndExecute(new AddFreePoint2DOp(planeId, position));
    create1Cmd.commit();
    commandStack.push(create1Cmd);
    const p1Id = p1Result.outputs.pointId;

    // Delete it
    const deleteCmd = new Command('Delete', operationContext);
    deleteCmd.addAndExecute(new RemovePoint2DOp(planeId, p1Id));
    deleteCmd.commit();
    commandStack.push(deleteCmd);

    // Create another point at same position (should get different ID)
    const create2Cmd = new Command('Create 2', operationContext);
    const p2Result = create2Cmd.addAndExecute(new AddFreePoint2DOp(planeId, position));
    create2Cmd.commit();
    commandStack.push(create2Cmd);
    const p2Id = p2Result.outputs.pointId;

    expect(p1Id).not.toBe(p2Id);

    // Serialize
    const serialized = ProjectService.serializeCommands(commandStack, operationContext.idAllocator.peek(), 'Create-Delete-Create Test');
    const { world: freshWorld, visibilityModel: freshVisibilityModel, commandStack: freshStack, operationContext: freshOperationContext } = createTestWorld();
    ProjectService.deserializeCommands(serialized, freshVisibilityModel, freshStack, freshOperationContext);

    const freshPlane = freshWorld.getProjectionPlaneById(planeId)!;
    expect(freshPlane.getPoint(p1Id)).toBeUndefined();
    expect(freshPlane.getPoint(p2Id)).toBeDefined();

    // Verify IDs are still different after deserialization
    expect(p1Id).not.toBe(p2Id);
  });
});
