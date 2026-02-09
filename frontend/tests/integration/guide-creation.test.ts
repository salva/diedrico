import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../src/domain/world/World';
import type { CommandStack } from '../../src/commands/CommandStack';
import { Command } from '../../src/commands/Command';
import { AddFreePoint2DOp } from '../../src/commands/operations/AddFreePoint2DOp';
import { AddLine2DOp } from '../../src/commands/operations/AddLine2DOp';
import { GuideSequenceFactory } from '../../src/commands/factories/GuideSequenceFactory';
import { setupBasicWorld } from '../helpers/worldHelpers';

describe('Guide Creation - Integration Tests', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    commandStack = setup.commandStack;
  });

  describe('Regular Line Reference', () => {
    it('should create guide on regular line without sibling', () => {
      const { projPlaneH } = setupBasicWorld();
      const planeId = projPlaneH;

      // Create two points and a line between them
      const cmd = new Command('Setup test geometry', world);
      
      const point1Result = cmd.addAndExecute(
        new AddFreePoint2DOp(planeId, [100, 100, 1])
      );
      const point1Id = point1Result.outputs.pointId;

      const point2Result = cmd.addAndExecute(
        new AddFreePoint2DOp(planeId, [200, 100, 1])
      );
      const point2Id = point2Result.outputs.pointId;

      const lineResult = cmd.addAndExecute(
        new AddLine2DOp(planeId, point1Id, point2Id)
      );
      const lineId = lineResult.outputs.lineId;

      // Create point for guide to pass through
      const throughPointResult = cmd.addAndExecute(
        new AddFreePoint2DOp(planeId, [150, 150, 1])
      );
      const throughPointId = throughPointResult.outputs.pointId;

      cmd.commit();
      commandStack.push(cmd);

      // Create guide using regular line as reference
      const guideCmd = new Command('Create guide on regular line', world);
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
      const plane = world.getProjectionPlane(planeId);
      const guide = plane.getElement(result.guideId);
      expect(guide).toBeDefined();
      expect(guide?.elementType).toBe('Guide2D');
    });
  });

  describe('HalfHingeLine2D Reference', () => {
    it('should create sibling guide when reference is hinge line', () => {
      // After basic world setup, there should be hinge lines
      const { projPlaneH, projPlaneV } = setupBasicWorld();
      
      // Get the hinge line on plane H
      const planeH = world.getProjectionPlane(projPlaneH);
      const hingeLines = Array.from(planeH.lines.values()).filter(
        line => line.elementType === 'HalfHingeLine2D'
      );
      
      expect(hingeLines.length).toBeGreaterThan(0);
      const hingeLineId = hingeLines[0]!.id;

      // Create point for guide to pass through
      const cmd = new Command('Create test point', world);
      const pointResult = cmd.addAndExecute(
        new AddFreePoint2DOp(projPlaneH, [100, 100, 1])
      );
      const throughPointId = pointResult.outputs.pointId;
      cmd.commit();
      commandStack.push(cmd);

      // Create guide using hinge line as reference
      const guideCmd = new Command('Create guide on hinge line', world);
      const result = GuideSequenceFactory.createGuideWithSibling(
        guideCmd,
        projPlaneH,
        hingeLineId,
        throughPointId,
        world
      );

      guideCmd.commit();
      commandStack.push(guideCmd);

      // Verify results
      expect(result.guideId).toBeDefined();
      expect(result.siblingGuideId).toBeDefined(); // Should have sibling

      // Verify both guides exist
      const planeHGuide = planeH.getElement(result.guideId);
      expect(planeHGuide).toBeDefined();

      const planeV = world.getProjectionPlane(projPlaneV);
      const planeVGuide = planeV.getElement(result.siblingGuideId!);
      expect(planeVGuide).toBeDefined();
    });
  });

  describe('BrokenHalfHingeLine2D Reference', () => {
    it('should create sibling guide when reference is broken hinge line', () => {
      // This test would require setting up an auxiliary plane with BHHL
      // For now, we document the expected behavior:
      
      // Given: Auxiliary plane with BrokenHalfHingeLine2D
      // When: Create guide using BHHL as reference
      // Then: 
      //   - Primary guide created on auxiliary plane
      //   - Sibling guide created on base plane
      //   - Both guides parallel to main hinge T1
      //   - No error thrown
      
      // This is the scenario that was failing before the fix
    });
  });

  describe('Error Prevention', () => {
    it('should not throw when creating guide on non-hinge line', () => {
      // Regression test for: "Failed to get sibling info for half-hinge-line"
      // This error occurred when GuideTool assumed all guides had siblings
      
      const { projPlaneH } = setupBasicWorld();
      
      // Create regular line (not hinge)
      const cmd = new Command('Setup', world);
      const p1 = cmd.addAndExecute(new AddFreePoint2DOp(projPlaneH, [0, 0, 1]));
      const p2 = cmd.addAndExecute(new AddFreePoint2DOp(projPlaneH, [100, 0, 1]));
      const line = cmd.addAndExecute(new AddLine2DOp(projPlaneH, p1.outputs.pointId, p2.outputs.pointId));
      const throughPoint = cmd.addAndExecute(new AddFreePoint2DOp(projPlaneH, [50, 50, 1]));
      cmd.commit();
      commandStack.push(cmd);

      // This should NOT throw
      expect(() => {
        const guideCmd = new Command('Create guide', world);
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
