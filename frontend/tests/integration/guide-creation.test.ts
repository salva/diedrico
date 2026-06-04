import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../src/domain/world/World';
import type { CommandStack } from '../../src/commands/CommandStack';
import { Command } from '../../src/commands/Command';
import { AddFreePoint2DOp } from '../../src/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '../../src/commands/operations/world/AddLineOp';
import { GuideSequenceFactory } from '../../src/commands/factories/GuideSequenceFactory';
import { setupBasicWorld } from '../helpers/worldHelpers';
import { Vector3 } from 'three';

describe('Guide Creation - Integration Tests', () => {
  let world: World;
  let commandStack: CommandStack;
  let projPlaneH: string;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    commandStack = setup.commandStack;
    projPlaneH = setup.projPlaneH;
  });

  describe('Regular Line Reference', () => {
    it('should create guide on regular line without sibling', () => {
      const planeId = projPlaneH;

      // Create two points and a line between them
      const cmd = new Command('Setup test geometry', { world });
      
      const point1Result = cmd.addAndExecute(
        new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1))
      );
      const point1Id = point1Result.outputs.pointId;

      const point2Result = cmd.addAndExecute(
        new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1))
      );
      const point2Id = point2Result.outputs.pointId;

      const lineResult = cmd.addAndExecute(
        new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id)
      );
      const lineId = lineResult.outputs.lineId;

      // Create point for guide to pass through
      const throughPointResult = cmd.addAndExecute(
        new AddFreePoint2DOp(planeId, new Vector3(150, 150, 1))
      );
      const throughPointId = throughPointResult.outputs.pointId;

      cmd.commit();
      commandStack.push(cmd);

      // Create guide using regular line as reference
      const guideCmd = new Command('Create guide on regular line', { world });
      const result = GuideSequenceFactory.createGuideWithSibling(
        guideCmd,
        planeId,
        lineId,
        throughPointId,
        world
      );

      guideCmd.commit();
      commandStack.push(guideCmd);

      // Verify results
      expect(result.guideId).toBeDefined();
      expect(result.siblingGuideId).toBeUndefined(); // No sibling for regular line

      // Verify guide exists in world
      const plane = world.getProjectionPlaneById(planeId)!;
      const guide = plane.getLine(result.guideId);
      expect(guide).toBeDefined();
      expect(guide?.id).toBe(result.guideId);
    });
  });


  describe('Error Prevention', () => {
    it('should not throw when creating guide on non-hinge line', () => {
      // Regression test for: "Failed to get sibling info for half-hinge-line"
      // This error occurred when GuideTool assumed all guides had siblings
      
      // Create regular line (not hinge)
      const cmd = new Command('Setup', { world });
      const p1 = cmd.addAndExecute(new AddFreePoint2DOp(projPlaneH, new Vector3(0, 0, 1)));
      const p2 = cmd.addAndExecute(new AddFreePoint2DOp(projPlaneH, new Vector3(100, 0, 1)));
      const line = cmd.addAndExecute(new AddLine2DByTwoPointsOp(projPlaneH, p1.outputs.pointId, p2.outputs.pointId));
      const throughPoint = cmd.addAndExecute(new AddFreePoint2DOp(projPlaneH, new Vector3(50, 50, 1)));
      cmd.commit();
      commandStack.push(cmd);

      // This should NOT throw
      expect(() => {
        const guideCmd = new Command('Create guide', { world });
        GuideSequenceFactory.createGuideWithSibling(
          guideCmd,
          projPlaneH,
          line.outputs.lineId,
          throughPoint.outputs.pointId,
          world
        );
        guideCmd.commit();
      }).not.toThrow();
    });
  });
});
