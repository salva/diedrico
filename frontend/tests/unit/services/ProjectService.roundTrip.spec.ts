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
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import { ProjectService } from '@/services/ProjectService';
import { deserializeOperation } from '@/commands/operations/OperationRegistry';
import { Command } from '@/commands/Command';
import { createTestWorld } from '../../helpers/worldHelpers';

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
    const { world: w, commandStack: cs } = createTestWorld();
    world = w;
    commandStack = cs;
  });

  it('AddFreePoint2DOp survives round-trip', () => {
    const op = new AddFreePoint2DOp('projPlaneH', new Vector3(5, 10, 1));
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddFreePoint2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.position).toEqual({ x: 5, y: 10, z: 1 });
  });

  it('AddLine2DByTwoPoints survives round-trip', () => {
    const op = new AddLine2DByTwoPointsOp('projPlaneH', 'point1', 'point2');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddLine2DByTwoPoints');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.point1Id).toBe('point1');
    expect(result.parameters.point2Id).toBe('point2');
  });

  it('AddSegment2DByPoints survives round-trip', () => {
    const op = new AddSegment2DByPointsOp('projPlaneH', 'point1', 'point2');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddSegment2DByPoints');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.point1Id).toBe('point1');
    expect(result.parameters.point2Id).toBe('point2');
  });

  it('AddCircle2DByCenterAndPoint survives round-trip', () => {
    const op = new AddCircle2DByCenterAndPointOp('projPlaneH', 'center', 'radiusPoint');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddCircle2DByCenterAndPoint');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.centerPointId).toBe('center');
    expect(result.parameters.circumferencePointId).toBe('radiusPoint');
  });

  it('AddGuide2DPerpendicularToLine survives round-trip', () => {
    const op = new AddGuide2DPerpendicularToLineOp('projPlaneH', 'lineId', 'pointId');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddGuide2DPerpendicularToLine');
    expect(result.serialize()).toEqual({
      opType: 'AddGuide2DPerpendicularToLine',
      planeId: 'projPlaneH',
      referenceLineId: 'lineId',
      throughPointId: 'pointId',
      guideId: undefined
    });
  });

  it('AddSiblingGuide2D survives round-trip', () => {
    const op = new AddSiblingGuide2DOp('projPlaneV', 'primaryGuide', 'refLine');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddSiblingGuide2D');
    expect(result.serialize()).toEqual({
      opType: 'AddSiblingGuide2D',
      planeId: 'projPlaneV',
      primaryGuideId: 'primaryGuide',
      referenceLineId: 'refLine',
      siblingGuideId: undefined
    });
  });

  it('AddLineLineIntersectionPoint2D survives round-trip', () => {
    const op = new AddLineLineIntersectionPoint2DOp('projPlaneH', 'line1', 'line2');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddLineLineIntersectionPoint2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.line1Id).toBe('line1');
    expect(result.parameters.line2Id).toBe('line2');
  });

  it('AddLineCircleIntersectionPoint2D survives round-trip', () => {
    const op = new AddLineCircleIntersectionPoint2DOp('projPlaneH', 'line', 'circle', 0);
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddLineCircleIntersectionPoint2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.lineId).toBe('line');
    expect(result.parameters.circleId).toBe('circle');
    expect(result.parameters.index).toBe(0);
  });

  it('AddCircleCircleIntersectionPoint2D survives round-trip', () => {
    const op = new AddCircleCircleIntersectionPoint2DOp('projPlaneH', 'circle1', 'circle2', 1);
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('AddCircleCircleIntersectionPoint2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.circle1Id).toBe('circle1');
    expect(result.parameters.circle2Id).toBe('circle2');
    expect(result.parameters.index).toBe(1);
  });

  it('RemovePoint2D survives round-trip', () => {
    const op = new RemovePoint2DOp('projPlaneH', 'point1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemovePoint2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.pointId).toBe('point1');
  });

  it('RemoveLine2D survives round-trip', () => {
    const op = new RemoveLine2DOp('projPlaneH', 'line1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveLine2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.lineId).toBe('line1');
  });

  it('RemoveSegment2D survives round-trip', () => {
    const op = new RemoveSegment2DOp('projPlaneH', 'segment1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveSegment2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.segmentId).toBe('segment1');
  });

  it('RemoveCircle2D survives round-trip', () => {
    const op = new RemoveCircle2DOp('projPlaneH', 'circle1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveCircle2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.circleId).toBe('circle1');
  });

  it('RemoveGuide2D survives round-trip', () => {
    const op = new RemoveGuide2DOp('projPlaneH', 'guide1');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveGuide2D');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.guideId).toBe('guide1');
  });

  it('UpdateElementStyle survives round-trip', () => {
    const op = new UpdateElementStyleOp('point1', 'projPlaneH', { color: '#FF0000', lineWidth: 2 });
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('UpdateElementStyle');
    expect(result.parameters.elementId).toBe('point1');
    expect(result.parameters.planeId).toBe('projPlaneH');
    expect(result.parameters.newStyle).toEqual({ color: '#FF0000', lineWidth: 2 });
  });

  it('RemoveActionFromProcessTree survives round-trip', () => {
    const op = new RemoveActionFromProcessTreeOp('action_123');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveActionFromProcessTree');
    expect(result.parameters.actionId).toBe('action_123');
  });

  it('RemoveActionGroupFromProcessTree survives round-trip', () => {
    const op = new RemoveActionGroupFromProcessTreeOp('group_456');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result.type).toBe('RemoveActionGroupFromProcessTree');
    expect(result.parameters.groupId).toBe('group_456');
  });

  it('RemoveSubprocessFromProcessTree survives round-trip', () => {
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
  const cmd = Command.restore({
    id: 'cmd-test',
    timestamp: '2024-01-01T00:00:00.000Z',
    description: 'Test command',
    operations: [op]
  }, world);
  commandStack.restoreCommittedCommands([cmd]);
  
  // 2. Serialize
  const projectData = ProjectService.serializeCommands(commandStack, world.peekNextId(), 'test-project');
  
  // 3. Deserialize using private method via type assertion
  // We only test parameter reconstruction, not full execution
  // Note: World initialization pushes commands to stack, so get the last command (our test command)
  const lastCommandIdx = projectData.commands.length - 1;
  const serializedOp = projectData.commands[lastCommandIdx].operations[0];
  const reconstructed = deserializeOperation(serializedOp);
  
  return reconstructed;
}
