/**
 * Tests for creating intersection points using Command + AddIntersectionPoint2DOp
 * Refactored from CreateIntersectionPointCommand to generic Command pattern (Phase 8, R017e)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddIntersectionPoint2DOp } from '../../../src/commands/operations/world/AddIntersectionPointOp';
import { AddLine2DByTwoPointsOp } from '../../../src/commands/operations/world/AddLineOp';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import { World } from '../../../src/domain/world/World';
import { Vector3 } from 'three';
import { getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('Create Intersection Point Command', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    planeId = getHorizontalPlaneId(world);
  });

  describe('execution', () => {
    it('should create intersection point between two lines', () => {
      const cmd = new Command("Create intersection point", world);
      
      // Create first line (horizontal)
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      // Create second line (vertical)
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p3Result.outputs.pointId!,
        p4Result.outputs.pointId!
      ));
      
      // Create intersection point
      const intersectionResult = cmd.addAndExecute(new AddIntersectionPoint2DOp(
        planeId,
        line1Result.outputs.lineId!,
        line2Result.outputs.lineId!,
        0
      ));
      
      expect(intersectionResult.success).toBe(true);
      
      const pointId = intersectionResult.outputs.pointId!;
      expect(pointId).toBeDefined();
      expect(pointId).toMatch(/point2d_/);
      
      const plane = getHorizontalPlane(world);
      const point = plane.getPoint(pointId);
      
      expect(point).toBeDefined();
      expect(point?.id).toBe(pointId);
      expect(point?.type).toBe('intersection');
    });

    it('should return pointId in outputs', () => {
      const cmd = new Command("Create intersection", world);
      
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p3Result.outputs.pointId!,
        p4Result.outputs.pointId!
      ));
      
      const intersectionResult = cmd.addAndExecute(new AddIntersectionPoint2DOp(
        planeId,
        line1Result.outputs.lineId!,
        line2Result.outputs.lineId!,
        0
      ));

      expect(intersectionResult.success).toBe(true);
      expect(intersectionResult.outputs.pointId).toBeDefined();
      expect(typeof intersectionResult.outputs.pointId).toBe('string');
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const cmd = new Command("Create intersection", world);
      
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p3Result.outputs.pointId!,
        p4Result.outputs.pointId!
      ));
      
      const intersectionResult = cmd.addAndExecute(new AddIntersectionPoint2DOp(
        planeId,
        line1Result.outputs.lineId!,
        line2Result.outputs.lineId!,
        0
      ));
      cmd.commit();
      
      const pointId = intersectionResult.outputs.pointId!;
      const plane = getHorizontalPlane(world);
      
      expect(plane.getPoint(pointId)).toBeDefined();
      
      cmd.undo();
      expect(plane.getPoint(pointId)).toBeUndefined();

      cmd.redo();
      expect(plane.getPoint(pointId)).toBeDefined();
    });

    it('should maintain stable IDs across undo/redo', () => {
      const cmd = new Command("Create intersection", world);
      
      const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(0, 100, 1)));
      const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
      const line1Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p1Result.outputs.pointId!,
        p2Result.outputs.pointId!
      ));
      
      const p3Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 0, 1)));
      const p4Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 200, 1)));
      const line2Result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
        planeId,
        p3Result.outputs.pointId!,
        p4Result.outputs.pointId!
      ));
      
      const intersectionResult = cmd.addAndExecute(new AddIntersectionPoint2DOp(
        planeId,
        line1Result.outputs.lineId!,
        line2Result.outputs.lineId!,
        0
      ));
      cmd.commit();
      
      const originalPointId = intersectionResult.outputs.pointId!;
      
      cmd.undo();
      cmd.redo();
      
      const plane = getHorizontalPlane(world);
      const point = plane.getPoint(originalPointId);
      expect(point?.id).toBe(originalPointId);
    });
  });
});
