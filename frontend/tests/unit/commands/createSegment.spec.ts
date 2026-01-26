/**
 * Tests for creating segments using Command + AddSegment2DByPointsOp
 * Refactored from CreateSegmentCommand to generic Command pattern (Phase 8, R017c)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddSegment2DByPointsOp } from '../../../src/commands/operations/world/AddSegmentOp';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import { World } from '../../../src/domain/world/World';
import { Vector3 } from 'three';
import { getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('Create Segment Command', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    planeId = getHorizontalPlaneId(world);
  });

  describe('execution', () => {
    it('should create a segment between two points', () => {
      const cmd = new Command("Create segment with points", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      
      const segmentResult = cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, point1Id, point2Id));
      
      expect(segmentResult.success).toBe(true);
      
      const segmentId = segmentResult.outputs.segmentId!;
      expect(segmentId).toBeDefined();
      expect(segmentId).toMatch(/segment2d_/);
      
      const plane = getHorizontalPlane(world);
      const segment = plane.getLine(segmentId);
      
      expect(segment).toBeDefined();
      expect(segment?.id).toBe(segmentId);
    });

    it('should return segmentId in outputs', () => {
      const cmd = new Command("Create segment", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      
      const segmentResult = cmd.addAndExecute(new AddSegment2DByPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));

      expect(segmentResult.success).toBe(true);
      expect(segmentResult.outputs.segmentId).toBeDefined();
      expect(typeof segmentResult.outputs.segmentId).toBe('string');
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const cmd = new Command("Create segment", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const segmentResult = cmd.addAndExecute(new AddSegment2DByPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      cmd.commit();
      
      const segmentId = segmentResult.outputs.segmentId!;
      const plane = getHorizontalPlane(world);
      
      expect(plane.getLine(segmentId)).toBeDefined();
      
      cmd.undo();
      expect(plane.getLine(segmentId)).toBeUndefined();

      cmd.redo();
      expect(plane.getLine(segmentId)).toBeDefined();
    });

    it('should maintain stable IDs across undo/redo', () => {
      const cmd = new Command("Create segment", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const segmentResult = cmd.addAndExecute(new AddSegment2DByPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      cmd.commit();
      
      const originalSegmentId = segmentResult.outputs.segmentId!;
      
      cmd.undo();
      cmd.redo();
      
      const plane = getHorizontalPlane(world);
      const segment = plane.getLine(originalSegmentId);
      expect(segment?.id).toBe(originalSegmentId);
    });
  });
});
