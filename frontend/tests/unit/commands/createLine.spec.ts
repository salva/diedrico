/**
 * Tests for creating lines using Command + AddLine2DByTwoPointsOp
 * Refactored from CreateLineCommand to generic Command pattern (Phase 8, R017b)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddLine2DByTwoPointsOp } from '../../../src/commands/operations/world/AddLineOp';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import type { World } from '../../../src/domain/world/World';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';
import { Vector3 } from 'three';

describe('Create Line Command', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeId = getHorizontalPlaneId(world);
  });

  describe('execution', () => {
    it('should create a line between two points', () => {
      // Create two points first
      const cmd = new Command("Create line with points", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      
      const point1Id = p1Result.outputs.pointId!;
      const point2Id = p2Result.outputs.pointId!;
      
      // Create line
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(planeId, point1Id, point2Id));
      
      expect(lineResult.success).toBe(true);
      
      const lineId = lineResult.outputs.lineId!;
      expect(lineId).toBeDefined();
      expect(lineId).toMatch(/line2d_/);
      
      const plane = getHorizontalPlane(world);
      const line = plane.getLine(lineId);
      
      expect(line).toBeDefined();
      expect(line?.id).toBe(lineId);
      expect(line?.point1Id).toBe(point1Id);
      expect(line?.point2Id).toBe(point2Id);
    });

    it('should return lineId in outputs', () => {
      const cmd = new Command("Create line", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));

      expect(lineResult.success).toBe(true);
      expect(lineResult.outputs.lineId).toBeDefined();
      expect(typeof lineResult.outputs.lineId).toBe('string');
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const cmd = new Command("Create line", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      cmd.commit();
      
      const lineId = lineResult.outputs.lineId!;
      const plane = getHorizontalPlane(world);
      
      expect(plane.getLine(lineId)).toBeDefined();
      
      // Undo
      cmd.undo();
      expect(plane.getLine(lineId)).toBeUndefined();

      // Redo
      cmd.redo();
      expect(plane.getLine(lineId)).toBeDefined();
    });

    it('should maintain stable IDs across undo/redo', () => {
      const cmd = new Command("Create line", world);
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 200, 1)));
      const lineResult = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      cmd.commit();
      
      const originalLineId = lineResult.outputs.lineId!;
      
      cmd.undo();
      cmd.redo();
      
      const plane = getHorizontalPlane(world);
      const line = plane.getLine(originalLineId);
      expect(line?.id).toBe(originalLineId);
    });
  });
});
