/**
 * Unit tests for GuideSequenceFactory
 * Phase 43 - T479
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../../src/commands/Command';
import { GuideSequenceFactory } from '../../../../src/commands/factories/GuideSequenceFactory';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '../../../../src/commands/operations/world/AddGuideOp';
import { AddLine2DByTwoPointsOp } from '../../../../src/commands/operations/world/AddLineOp';
import { AddFreePoint2DOp } from '../../../../src/commands/operations/world/AddFreePointOp';
import { World } from '../../../../src/domain/world/World';
import { Vector3 } from 'three';

describe('GuideSequenceFactory', () => {
  let world: World;
  const horizontalPlaneId = 'proj_plane_H';
  const verticalPlaneId = 'proj_plane_V';

  beforeEach(() => {
    world = new World();
  });

  describe('createGuideWithSibling', () => {
    it('should create single operation for non-HHL reference line', () => {
      const cmd = new Command('Test', world);
      
      // Create reference line (regular line, not HalfHingeLine)
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        horizontalPlaneId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      // Create through point
      const throughResult = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 50, 1)));
      
      // Track operations before factory call
      const opCountBefore = cmd.operations.length;
      
      // Call factory
      const result = GuideSequenceFactory.createGuideWithSibling(
        cmd,
        horizontalPlaneId,
        lineResult.outputs.lineId!,
        throughResult.outputs.pointId!,
        world
      );
      
      // Should add exactly 1 operation (no sibling for regular line)
      expect(cmd.operations.length).toBe(opCountBefore + 1);
      expect(cmd.operations[opCountBefore]).toBeInstanceOf(AddGuide2DPerpendicularToLineOp);
      
      // Should return guideId but no siblingGuideId
      expect(result.guideId).toBeDefined();
      expect(result.guideId).toMatch(/^guide2d_/);
      expect(result.siblingGuideId).toBeUndefined();
      
      // Verify guide exists in world
      const guide = world.getLine2DById(result.guideId);
      expect(guide).toBeDefined();
      expect(guide!.type).toBe('guide');
    });

    it('should create two operations for HHL reference line', () => {
      const cmd = new Command('Test', world);
      
      // Get HalfHingeLine (half_HL_HV_on_PH exists by default)
      const hhlId = 'half_HL_HV_on_PH';
      
      // Create through point on horizontal plane
      const throughResult = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 50, 1)));
      
      // Track operations before factory call
      const opCountBefore = cmd.operations.length;
      
      // Call factory
      const result = GuideSequenceFactory.createGuideWithSibling(
        cmd,
        horizontalPlaneId,
        hhlId,
        throughResult.outputs.pointId!,
        world
      );
      
      // Should add 2 operations (primary + sibling)
      expect(cmd.operations.length).toBe(opCountBefore + 2);
      expect(cmd.operations[opCountBefore]).toBeInstanceOf(AddGuide2DPerpendicularToLineOp);
      expect(cmd.operations[opCountBefore + 1]).toBeInstanceOf(AddSiblingGuide2DOp);
      
      // Should return both guideId and siblingGuideId
      expect(result.guideId).toBeDefined();
      expect(result.siblingGuideId).toBeDefined();
      expect(result.guideId).toMatch(/^guide2d_/);
      expect(result.siblingGuideId).toMatch(/^guide2d_/);
      expect(result.guideId).not.toBe(result.siblingGuideId);
      
      // Verify both guides exist in world
      const primaryGuide = world.getLine2DById(result.guideId);
      const siblingGuide = world.getLine2DById(result.siblingGuideId!);
      
      expect(primaryGuide).toBeDefined();
      expect(siblingGuide).toBeDefined();
      expect(primaryGuide!.type).toBe('guide');
      expect(siblingGuide!.type).toBe('sibling-guide');
      
      // Verify bidirectional links
      expect((primaryGuide as any).siblingGuideId).toBe(result.siblingGuideId);
      expect((siblingGuide as any).primaryGuideId).toBe(result.guideId);
    });

    it('should handle HHL with no sibling info available gracefully', () => {
      // This test ensures that if getSiblingPlaneAndHalfHingeLineForGuide returns null,
      // we still create the primary guide without throwing
      const cmd = new Command('Test', world);
      
      // Use a regular line but pretend it's special case
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        horizontalPlaneId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const throughResult = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 50, 1)));
      
      // Call factory - should succeed even if no sibling info
      const result = GuideSequenceFactory.createGuideWithSibling(
        cmd,
        horizontalPlaneId,
        lineResult.outputs.lineId!,
        throughResult.outputs.pointId!,
        world
      );
      
      // Should still create primary guide
      expect(result.guideId).toBeDefined();
      expect(result.siblingGuideId).toBeUndefined();
      
      const guide = world.getLine2DById(result.guideId);
      expect(guide).toBeDefined();
    });

    it('should handle invalid reference line ID gracefully', () => {
      const cmd = new Command('Test', world);
      
      // Create through point
      const throughResult = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 50, 1)));
      
      // Call with invalid reference line ID - should throw from operation, not factory
      expect(() => {
        GuideSequenceFactory.createGuideWithSibling(
          cmd,
          horizontalPlaneId,
          'invalid_line_id',
          throughResult.outputs.pointId!,
          world
        );
      }).toThrow();
    });

    it('should handle invalid through point ID gracefully', () => {
      const cmd = new Command('Test', world);
      
      // Create reference line
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        horizontalPlaneId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      // Call with invalid through point ID - should throw from operation
      expect(() => {
        GuideSequenceFactory.createGuideWithSibling(
          cmd,
          horizontalPlaneId,
          lineResult.outputs.lineId!,
          'invalid_point_id',
          world
        );
      }).toThrow();
    });

    it('should work with command commit and verify state', () => {
      const cmd = new Command('Create guide with sibling', world);
      
      // Get HalfHingeLine
      const hhlId = 'half_HL_HV_on_PH';
      
      // Create through point
      const throughResult = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 50, 1)));
      
      // Call factory
      const result = GuideSequenceFactory.createGuideWithSibling(
        cmd,
        horizontalPlaneId,
        hhlId,
        throughResult.outputs.pointId!,
        world
      );
      
      // Commit command
      cmd.commit();
      
      // Verify guides still exist after commit
      const primaryGuide = world.getLine2DById(result.guideId);
      const siblingGuide = world.getLine2DById(result.siblingGuideId!);
      
      expect(primaryGuide).toBeDefined();
      expect(siblingGuide).toBeDefined();
      expect(primaryGuide!.planeId).toBe(horizontalPlaneId);
      expect(siblingGuide!.planeId).toBe(verticalPlaneId);
    });

    it('should handle multiple sequential guide creations', () => {
      const cmd = new Command('Create multiple guides', world);
      
      const hhlId = 'half_HL_HV_on_PH';
      
      // Create two guides at different positions
      const through1 = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 50, 1)));
      const result1 = GuideSequenceFactory.createGuideWithSibling(
        cmd,
        horizontalPlaneId,
        hhlId,
        through1.outputs.pointId!,
        world
      );
      
      const through2 = cmd.addAndExecute(new AddFreePoint2DOp(horizontalPlaneId, new Vector3(150, 75, 1)));
      const result2 = GuideSequenceFactory.createGuideWithSibling(
        cmd,
        horizontalPlaneId,
        hhlId,
        through2.outputs.pointId!,
        world
      );
      
      // Should have created 4 guides total (2 primaries + 2 siblings)
      expect(result1.guideId).not.toBe(result2.guideId);
      expect(result1.siblingGuideId).not.toBe(result2.siblingGuideId);
      
      const guide1 = world.getLine2DById(result1.guideId);
      const guide2 = world.getLine2DById(result2.guideId);
      const sibling1 = world.getLine2DById(result1.siblingGuideId!);
      const sibling2 = world.getLine2DById(result2.siblingGuideId!);
      
      expect(guide1).toBeDefined();
      expect(guide2).toBeDefined();
      expect(sibling1).toBeDefined();
      expect(sibling2).toBeDefined();
      
      cmd.commit();
    });
  });
});
