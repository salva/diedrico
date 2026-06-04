/**
 * Tests for creating guides using Command + AddGuide2DPerpendicularToLineOp
 * Refactored from CreateGuideCommand to generic Command pattern (Phase 8, R017f)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddGuide2DPerpendicularToLineOp } from '../../../src/commands/operations/world/AddGuideOp';
import { AddLine2DByTwoPointsOp } from '../../../src/commands/operations/world/AddLineOp';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import { Guide2D } from '../../../src/domain/world/Guide';
import type { World } from '../../../src/domain/world/World';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';
import { Vector3 } from 'three';

describe('Create Guide Command', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeId = getHorizontalPlaneId(world);
  });

  describe('execution', () => {
    it('should create a guide perpendicular to a line through a point', () => {
      const cmd = new Command("Create guide", world);
      
      // Create reference line
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      // Create point through which guide passes
      const throughPointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 50, 1)));
      
      // Create guide
      const guideResult = cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(
        planeId,
        lineResult.outputs.lineId!,
        throughPointResult.outputs.pointId!
      ));
      
      expect(guideResult.success).toBe(true);
      
      const guideId = guideResult.outputs.guideId!;
      expect(guideId).toBeDefined();
      expect(guideId).toMatch(/guide2d\d+/);
      
      const plane = getHorizontalPlane(world);
      const guide = plane.getLine(guideId);
      
      expect(guide).toBeDefined();
      expect(guide?.id).toBe(guideId);
      expect(guide).toBeInstanceOf(Guide2D);
    });

    it('should return guideId in outputs', () => {
      const cmd = new Command("Create guide", world);
      
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const throughPointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 50, 1)));
      
      const guideResult = cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(
        planeId,
        lineResult.outputs.lineId!,
        throughPointResult.outputs.pointId!
      ));

      expect(guideResult.success).toBe(true);
      expect(guideResult.outputs.guideId).toBeDefined();
      expect(typeof guideResult.outputs.guideId).toBe('string');
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const cmd = new Command("Create guide", world);
      
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const throughPointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 50, 1)));
      
      const guideResult = cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(
        planeId,
        lineResult.outputs.lineId!,
        throughPointResult.outputs.pointId!
      ));
      cmd.commit();
      
      const guideId = guideResult.outputs.guideId!;
      const plane = getHorizontalPlane(world);
      
      expect(plane.getLine(guideId)).toBeDefined();
      
      cmd.undo();
      expect(plane.getLine(guideId)).toBeUndefined();

      cmd.redo();
      expect(plane.getLine(guideId)).toBeDefined();
    });

    it('should maintain stable IDs across undo/redo', () => {
      const cmd = new Command("Create guide", world);
      
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const throughPointResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 50, 1)));
      
      const guideResult = cmd.addAndExecute(new AddGuide2DPerpendicularToLineOp(
        planeId,
        lineResult.outputs.lineId!,
        throughPointResult.outputs.pointId!
      ));
      cmd.commit();
      
      const originalGuideId = guideResult.outputs.guideId!;
      
      cmd.undo();
      cmd.redo();
      
      const plane = getHorizontalPlane(world);
      const guide = plane.getLine(originalGuideId);
      expect(guide?.id).toBe(originalGuideId);
    });
  });
});
