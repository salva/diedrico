/**
 * Round-Trip Serialization Tests
 * 
 * Purpose: Verify all operation types survive serialization without data loss
 * 
 * For each operation type:
 * 1. Create operation with test parameters
 * 2. Serialize via ProjectService
 * 3. Deserialize to reconstruct operation
 * 4. Verify parameters match original
 * 
 * Reference: Phase 40 Task T438
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import { ProjectService } from '@/services/ProjectService';
import { Command } from '@/commands/Command';

// Import operation classes
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '@/commands/operations/world/AddGuideOp';
import { AddLineLineIntersectionPoint2DOp } from '@/commands/operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddCircleCircleIntersectionPoint2DOp';
import { RemovePoint2DOp, RemoveLine2DOp, RemoveSegment2DOp, RemoveCircle2DOp, RemoveGuide2DOp } from '@/commands/operations/world/RemoveElementOps';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import { RemoveActionFromProcessTreeOp, RemoveActionGroupFromProcessTreeOp, RemoveSubprocessFromProcessTreeOp } from '@/commands/operations/processTree/ProcessTreeOperations';

describe('Round-Trip Serialization Tests', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
  });

  it('AddFreePoint2DOp survives round-trip', () => {
    const op = new AddFreePoint2DOp('proj_plane_H', new Vector3(5, 10, 1));
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddFreePoint2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.position).toEqual({ x: 5, y: 10, z: 1 });
  });

  it('AddLine2DOp survives round-trip', () => {
    const op = new AddLine2DByTwoPointsOp('proj_plane_H', 'point1', 'point2');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddLine2DByTwoPoints');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.point1Id).toBe('point1');
    expect(result.parameters.point2Id).toBe('point2');
  });

  it('AddSegment2DOp survives round-trip', () => {
    const op = new AddSegment2DByPointsOp('proj_plane_H', 'point1', 'point2');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddSegment2DByPoints');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.point1Id).toBe('point1');
    expect(result.parameters.point2Id).toBe('point2');
  });

  it('AddCircle2DOp survives round-trip', () => {
    const op = new AddCircle2DByCenterAndPointOp('proj_plane_H', 'center', 'radiusPoint');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddCircle2DByCenterAndPoint');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.centerPointId).toBe('center');
    expect(result.parameters.circumferencePointId).toBe('radiusPoint');
  });

  it('AddGuide2DOp survives round-trip', () => {
    const op = new AddGuide2DPerpendicularToLineOp('proj_plane_H', 'lineId', 'pointId');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddGuide2DPerpendicularToLine');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.referenceLineId).toBe('lineId');
    expect(result.parameters.throughPointId).toBe('pointId');
  });

  it('AddSiblingGuide2DOp survives round-trip', () => {
    const op = new AddSiblingGuide2DOp('proj_plane_V', 'primaryGuide', 'refLine');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddSiblingGuide2D');
    expect(result.parameters.planeId).toBe('proj_plane_V');
    expect(result.parameters.primaryGuideId).toBe('primaryGuide');
    expect(result.parameters.referenceLineId).toBe('refLine');
  });

  it('AddLineLineIntersectionPoint2DOp survives round-trip', () => {
    const op = new AddLineLineIntersectionPoint2DOp('proj_plane_H', 'line1', 'line2');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddLineLineIntersectionPoint2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.line1Id).toBe('line1');
    expect(result.parameters.line2Id).toBe('line2');
  });

  it('AddLineCircleIntersectionPoint2DOp survives round-trip', () => {
    const op = new AddLineCircleIntersectionPoint2DOp('proj_plane_H', 'line', 'circle', 0);
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddLineCircleIntersectionPoint2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.lineId).toBe('line');
    expect(result.parameters.circleId).toBe('circle');
    expect(result.parameters.index).toBe(0);
  });

  it('AddCircleCircleIntersectionPoint2DOp survives round-trip', () => {
    const op = new AddCircleCircleIntersectionPoint2DOp('proj_plane_H', 'circle1', 'circle2', 1);
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddCircleCircleIntersectionPoint2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.circle1Id).toBe('circle1');
    expect(result.parameters.circle2Id).toBe('circle2');
    expect(result.parameters.index).toBe(1);
  });

  it('RemovePoint2DOp survives round-trip', () => {
    const op = new RemovePoint2DOp('proj_plane_H', 'point1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemovePoint2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.pointId).toBe('point1');
  });

  it('RemoveLine2DOp survives round-trip', () => {
    const op = new RemoveLine2DOp('proj_plane_H', 'line1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveLine2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.lineId).toBe('line1');
  });

  it('RemoveSegment2DOp survives round-trip', () => {
    const op = new RemoveSegment2DOp('proj_plane_H', 'segment1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveSegment2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.segmentId).toBe('segment1');
  });

  it('RemoveCircle2DOp survives round-trip', () => {
    const op = new RemoveCircle2DOp('proj_plane_H', 'circle1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveCircle2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.circleId).toBe('circle1');
  });

  it('RemoveGuide2DOp survives round-trip', () => {
    const op = new RemoveGuide2DOp('proj_plane_H', 'guide1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveGuide2D');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.guideId).toBe('guide1');
  });

  it('UpdateElementStyleOp survives round-trip', () => {
    const op = new UpdateElementStyleOp('point1', 'proj_plane_H', { color: '#FF0000', strokeWidth: 2 });
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('UpdateElementStyle');
    expect(result.parameters.elementId).toBe('point1');
    expect(result.parameters.planeId).toBe('proj_plane_H');
    expect(result.parameters.newStyle).toEqual({ color: '#FF0000', strokeWidth: 2 });
  });

  it('RemoveActionFromProcessTreeOp survives round-trip', () => {
    const op = new RemoveActionFromProcessTreeOp('action_123');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveActionFromProcessTree');
    expect(result.parameters.actionId).toBe('action_123');
  });

  it('RemoveActionGroupOp survives round-trip', () => {
    const op = new RemoveActionGroupFromProcessTreeOp('group_456');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveActionGroupFromProcessTree');
    expect(result.parameters.groupId).toBe('group_456');
  });

  it('RemoveSubprocessOp survives round-trip', () => {
    const op = new RemoveSubprocessFromProcessTreeOp('subprocess_789');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveSubprocessFromProcessTree');
    expect(result.parameters.subprocessId).toBe('subprocess_789');
  });
});

/**
 * Helper: Round-trip an operation through serialization
 * Tests that operation parameters survive serialization without data loss
 */
function roundTripOperation(op: any, world: World, commandStack: CommandStack): any {
  // 1. Create command with operation
  const cmd = new Command('Test command');
  (cmd as any).operations = [op];
  (commandStack as any).undoStack.push(cmd);
  
  // 2. Serialize
  const projectData = ProjectService.serializeCommands(commandStack, 'test-project');
  
  // 3. Deserialize using private method via type assertion
  // We only test parameter reconstruction, not full execution
  const serializedOp = projectData.commands[0].operations[0];
  const reconstructed = (ProjectService as any).reconstructOperation(serializedOp);
  
  return reconstructed;
}
