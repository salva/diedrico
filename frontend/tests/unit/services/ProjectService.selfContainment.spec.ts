/**
 * Self-Containment Tests for Operations (Phase 40 T440)
 * 
 * These tests verify that operations are self-contained - their parameters
 * contain ALL needed data and they don't depend on World/CommandStack state.
 * 
 * Test Strategy:
 * - For each operation type, create parameters object
 * - Serialize the operation
 * - Deserialize on a FRESH World (no prior state)
 * - Verify the operation executes successfully
 * 
 * This ensures operations can be replayed in any context (undo/redo, project load).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { ProjectService } from '@/services/ProjectService';
import { Vector3 } from 'three';
import { 
  AddFreePoint2DOp 
} from '@/commands/operations/world/AddFreePointOp';
import { 
  AddLine2DByTwoPointsOp 
} from '@/commands/operations/world/AddLineOp';
import { 
  AddSegment2DByPointsOp 
} from '@/commands/operations/world/AddSegmentOp';
import { 
  AddCircle2DByCenterAndPointOp 
} from '@/commands/operations/world/AddCircleOp';
import { 
  AddGuide2DPerpendicularToLineOp 
} from '@/commands/operations/world/AddGuideOp';
import { 
  RemovePoint2DOp 
} from '@/commands/operations/world/RemoveElementOps';
import { 
  UpdateElementStyleOp 
} from '@/commands/operations/world/UpdateElementStyleOp';

describe('ProjectService Self-Containment Tests', () => {
  let world: World;
  let commandStack: CommandStack;
  const planeId = 'proj_plane_H'; // Fixed plane ID that exists in every World

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
  });

  /**
   * Test that AddFreePoint2DOp is self-contained
   */
  it('AddFreePoint2DOp should be self-contained', () => {
    // Create operation
    const cmd = new Command('Test', world);
    cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
    cmd.commit();
    commandStack.push(cmd);

    // Serialize
    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');

    // Deserialize on FRESH World (no prior state except plane initialization)
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    // This should succeed - operation parameters contain everything needed
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();

    // Verify the operation executed
    const plane = freshWorld.getProjectionPlaneById(planeId);
    expect(plane).toBeDefined();
    // Note: plane starts with 1 point (O_H), so after adding one we have 2
    expect(plane!.getAllPoints().length).toBe(2);
  });

  /**
   * Test that AddLine2DByTwoPoints is self-contained (depends on points but parameters have IDs)
   */
  it('AddLine2DByTwoPoints should be self-contained', () => {
    // Create points and line
    const cmd = new Command('Test', world);
    const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
    const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
    cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Result.outputs.pointId, p2Result.outputs.pointId));
    cmd.commit();
    commandStack.push(cmd);

    // Serialize
    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');

    // Deserialize on FRESH World - this should succeed without errors
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();
  });

  /**
   * Test that AddSegment2DByPoints is self-contained
   */
  it('AddSegment2DByPoints should be self-contained', () => {
    const cmd = new Command('Test', world);
    const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
    const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
    cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, p1Result.outputs.pointId, p2Result.outputs.pointId));
    cmd.commit();
    commandStack.push(cmd);

    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();
  });

  /**
   * Test that AddCircle2DByCenterAndPoint is self-contained
   */
  it('AddCircle2DByCenterAndPoint should be self-contained', () => {
    const cmd = new Command('Test', world);
    const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(50, 50, 1)));
    const radiusResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 50, 1)));
    cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, centerResult.outputs.pointId, radiusResult.outputs.pointId));
    cmd.commit();
    commandStack.push(cmd);

    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();

    const plane = freshWorld.getProjectionPlaneById(planeId);
    expect(plane!.getAllCircles().length).toBe(1);
  });

  /**
   * Test that AddGuide2DPerpendicularToLine is self-contained
   */
  it('AddGuide2DPerpendicularToLine should be self-contained', () => {
    const cmd = new Command('Test', world);
    const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
    const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
    const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Result.outputs.pointId, p2Result.outputs.pointId));
    const pointOnGuideResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(50, 50, 1)));
    cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(
      planeId, 
      lineResult.outputs.lineId, 
      pointOnGuideResult.outputs.pointId
    ));
    cmd.commit();
    commandStack.push(cmd);

    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();
  });

  /**
   * Test that UpdateElementStyleOp is self-contained
   */
  it('UpdateElementStyleOp should be self-contained', () => {
    const cmd = new Command('Test', world);
    const pointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
    cmd.addAndExecute(new UpdateElementStyleOp(
      pointResult.outputs.pointId,
      planeId,
      { color: '#FF0000', size: 8 }
    ));
    cmd.commit();
    commandStack.push(cmd);

    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();
  });

  /**
   * Test that RemoveElement2DOp is self-contained
   */
  it('RemoveElement2DOp should be self-contained', () => {
    // Create and remove a point
    const cmd1 = new Command('Create', world);
    const pointResult = cmd1.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
    cmd1.commit();
    commandStack.push(cmd1);

    const cmd2 = new Command('Remove', world);
    cmd2.addAndExecute(new RemovePoint2DOp(planeId, pointResult.outputs.pointId));
    cmd2.commit();
    commandStack.push(cmd2);

    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();

    const plane = freshWorld.getProjectionPlaneById(planeId);
    // Note: O_H point always exists, so after creating and removing one point we have 1
    expect(plane!.getAllPoints().length).toBe(1); // Only O_H remains
  });

  /**
   * Test complex multi-operation sequence is self-contained
   */
  it('Complex multi-operation sequence should be self-contained', () => {
    // Create complex construction
    const cmd = new Command('Complex', world);
    
    // Points
    const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
    const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
    const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(50, 50, 1)));
    
    // Lines
    const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Result.outputs.pointId, p2Result.outputs.pointId));
    
    // Segment
    cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, p1Result.outputs.pointId, p3Result.outputs.pointId));
    
    // Circle
    cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, p3Result.outputs.pointId, p1Result.outputs.pointId));
    
    // Guide
    cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(planeId, lineResult.outputs.lineId, p3Result.outputs.pointId));
    
    // Style update
    cmd.addAndExecute(new UpdateElementStyleOp(p1Result.outputs.pointId, planeId, { color: '#0000FF' }));
    
    cmd.commit();
    commandStack.push(cmd);

    // Serialize and replay on fresh World - this should succeed
    const serialized = ProjectService.serializeCommands(commandStack, 'Test Project');
    const freshWorld = new World();
    const freshStack = new CommandStack();
    
    expect(() => {
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
    }).not.toThrow();
  });
});
