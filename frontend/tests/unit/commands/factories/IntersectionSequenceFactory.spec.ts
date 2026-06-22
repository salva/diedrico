/**
 * Unit tests for IntersectionSequenceFactory
 * 
 * Focuses on testing the HalfHingeLine sibling intersection creation behavior.
 * Basic intersection functionality is covered by integration tests and tool tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntersectionSequenceFactory } from '@/commands/factories/IntersectionSequenceFactory';
import { Command } from '@/commands/Command';
import type { World } from '@/domain/world/World';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { createTestWorld, getHorizontalPlane, getMainHingeLine, getVerticalPlane } from '../../../helpers/worldHelpers';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { SiblingIntersectionPoint2D } from '@/domain/world/Point';
import { Vector3 } from 'three';
import { createActionGroup } from '@/domain/processTree/ProcessTree';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';

// Helper to create ActionGroup for a command
function createGroupForCommand(cmd: Command): string {
  const groupId = `group_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const group = createActionGroup(groupId);
  cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
  return groupId;
}

describe('IntersectionSequenceFactory', () => {
  let world: World;
  let operationContext: OperationContext;
  let visibilityModel;
  let planeId: string;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, operationContext: context } = createTestWorld();
    world = w;
    operationContext = context;

    visibilityModel = vm;    planeId = getHorizontalPlane(world).id;
  });

  describe('HalfHingeLine sibling intersection creation (Phase 42)', () => {
    it('should create sibling intersection when line intersects HHL', () => {
      // Setup: Create a line that intersects with HHL
      const cmd = new Command('Setup', operationContext);
      
      // Get HalfHingeLine on horizontal plane
      const horizontalPlane = getHorizontalPlane(world);
      const mainHingeLine = getMainHingeLine(world);
      const hhl = horizontalPlane.getAllLines().find(
        l => (l as any).hingeLineId === mainHingeLine.id
      );
      if (!hhl) {
        throw new Error('HalfHingeLine not found on horizontal plane');
      }
      const hhlId = hhl.id;
      
      // Create a line that intersects the HHL
      // HHL is horizontal at y=0, so create a vertical line at x=5
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, -5, 1)));
      const point1Id = p1Result.outputs.pointId!;
      
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const point2Id = p2Result.outputs.pointId!;
      
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      const lineId = lineResult.outputs.lineId!;
      
      cmd.commit();

      // Test: Create intersection with HHL using proper typed method
      const intersectionCmd = new Command('Create HHL intersection', operationContext);
      const groupId = createGroupForCommand(intersectionCmd);

      const result = IntersectionSequenceFactory.createLineLineIntersection(
        intersectionCmd, planeId, hhlId, lineId, world, groupId
      );

      // Verify: Primary intersection created
      expect(result.pointId).toBeDefined();
      expect(typeof result.pointId).toBe('string');

      // Verify: Sibling intersection created
      expect(result.siblingPointId).toBeDefined();
      expect(typeof result.siblingPointId).toBe('string');
      expect(result.pointId).not.toBe(result.siblingPointId);

      intersectionCmd.commit();

      // Verify: Both points exist in world
      const verticalPlane = getVerticalPlane(world);
      
      const primaryPoint = horizontalPlane.getPoint(result.pointId);
      const siblingPoint = verticalPlane.getPoint(result.siblingPointId!);
      
      expect(primaryPoint).toBeDefined();
      expect(siblingPoint).toBeDefined();
      expect(siblingPoint).toBeInstanceOf(SiblingIntersectionPoint2D);

      // Verify: Bidirectional links
      expect((primaryPoint as any).siblingPointId).toBe(result.siblingPointId);
      expect((siblingPoint as any).primaryIntersectionId).toBe(result.pointId);

      // Verify: Both points realize to same coordinate (parametric consistency)
      const realizationContext = operationContext.realizationContext;
      const primaryRealization = operationContext.realizations.realizePoint2D(primaryPoint!, realizationContext);
      const siblingRealization = operationContext.realizations.realizePoint2D(siblingPoint!, realizationContext);
      
      expect(primaryRealization).toBeDefined();
      expect(siblingRealization).toBeDefined();
      expect(primaryRealization!.position.x).toBeCloseTo(siblingRealization!.position.x);
      expect(primaryRealization!.position.y).toBeCloseTo(siblingRealization!.position.y);
    });

    it('should create only primary intersection for non-HHL line', () => {
      // Setup: Create two regular lines that intersect
      const cmd = new Command('Setup', operationContext);
      
      // Line 1: horizontal
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(10, 0, 1)));
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Result.outputs.pointId!, p2Result.outputs.pointId!));
      
      // Line 2: vertical
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, -5, 1)));
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(5, 5, 1)));
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p3Result.outputs.pointId!, p4Result.outputs.pointId!));
      
      cmd.commit();

      // Test: Create intersection using proper typed method
      const intersectionCmd = new Command('Create regular intersection', operationContext);
      const groupId = createGroupForCommand(intersectionCmd);

      const result = IntersectionSequenceFactory.createLineLineIntersection(
        intersectionCmd, planeId, line1Result.outputs.lineId!, line2Result.outputs.lineId!, world, groupId
      );

      // Verify: Only primary intersection created (no sibling)
      expect(result.pointId).toBeDefined();
      expect(result.siblingPointId).toBeUndefined();
    });

    it('should create sibling for line-circle intersection with HHL', () => {
      // Setup: Create circle and HHL that intersect
      const cmd = new Command('Setup', operationContext);
      
      // Get HalfHingeLine on horizontal plane
      const horizontalPlane = getHorizontalPlane(world);
      const mainHingeLine = getMainHingeLine(world);
      const hhl = horizontalPlane.getAllLines().find(
        l => (l as any).hingeLineId === mainHingeLine.id
      );
      if (!hhl) {
        throw new Error('HalfHingeLine not found on horizontal plane');
      }
      const hhlId = hhl.id;
      
      // Create a circle centered at (0, 5) with radius passing through (0, 0)
      // This will intersect the HHL (y=0 line) at two points
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 5, 1)));
      const circlePointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 0, 1)));
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
        planeId,
        centerResult.outputs.pointId!,
        circlePointResult.outputs.pointId!
      ));
      
      cmd.commit();

      // Test: Create line-circle intersection using proper typed method
      const intersectionCmd = new Command('Create HHL-circle intersection', operationContext);
      const groupId = createGroupForCommand(intersectionCmd);

      const result = IntersectionSequenceFactory.createLineCircleIntersection(
        intersectionCmd, planeId, hhlId, circleResult.outputs.circleId!, 0, world, groupId
      );

      // Verify: Both primary and sibling created
      expect(result.pointId).toBeDefined();
      expect(result.siblingPointId).toBeDefined();

      intersectionCmd.commit();

      // Verify: Both points exist
      const verticalPlane = getVerticalPlane(world);
      
      const primaryPoint = horizontalPlane.getPoint(result.pointId);
      const siblingPoint = verticalPlane.getPoint(result.siblingPointId!);
      
      expect(primaryPoint).toBeDefined();
      expect(siblingPoint).toBeDefined();
      expect(siblingPoint).toBeInstanceOf(SiblingIntersectionPoint2D);
    });
  });
});
