/**
 * Tests for creating circles using Command + AddCircle2DByCenterAndPointOp
 * Refactored from CreateCircleCommand to generic Command pattern (Phase 8, R017d)
 * 
 * Note: Circle2DByCenterAndPoint is the standard circle construction.
 * The circumferencePointId defines both the radius magnitude and angular reference.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddCircle2DByCenterAndPointOp } from '../../../src/commands/operations/world/AddCircleOp';
import { AddFreePoint2DOp } from '../../../src/commands/operations/AddFreePointOp';
import { World } from '../../../src/domain/world/World';
import { Vector3 } from 'three';

describe('Create Circle Command', () => {
  let world: World;
  const planeId = 'proj_plane_H';

  beforeEach(() => {
    world = new World();
  });

  describe('execution', () => {
    it('should create a circle with center and circumference point', () => {
      const cmd = new Command("Create circle with two points", world);
      
      // Create center point
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const centerId = centerResult.outputs.pointId!;
      
      // Create circumference point (defines radius vector)
      const circumferenceResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(150, 100, 1)));
      const circumferenceId = circumferenceResult.outputs.pointId!;
      
      // Create circle
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
        planeId,
        centerId,
        circumferenceId
      ));
      
      expect(circleResult.success).toBe(true);
      
      const circleId = circleResult.outputs.circleId!;
      expect(circleId).toBeDefined();
      expect(circleId).toMatch(/^circle2d_/);
      
      const plane = world.projectionPlanes.get(planeId)!;
      const circle = plane.getCircle(circleId);
      
      expect(circle).toBeDefined();
      expect(circle?.id).toBe(circleId);
      expect(circle?.centerPointId).toBe(centerId);
      expect(circle?.circumferencePointId).toBe(circumferenceId);
    });

    it('should return circleId in outputs', () => {
      const cmd = new Command("Create circle", world);
      
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const circumferenceResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(150, 150, 1)));
      
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
        planeId,
        centerResult.outputs.pointId!,
        circumferenceResult.outputs.pointId!
      ));

      expect(circleResult.success).toBe(true);
      expect(circleResult.outputs.circleId).toBeDefined();
      expect(typeof circleResult.outputs.circleId).toBe('string');
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const cmd = new Command("Create circle", world);
      
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const circumferenceResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(150, 100, 1)));
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
        planeId,
        centerResult.outputs.pointId!,
        circumferenceResult.outputs.pointId!
      ));
      cmd.commit();
      
      const circleId = circleResult.outputs.circleId!;
      const plane = world.projectionPlanes.get(planeId)!;
      
      expect(plane.getCircle(circleId)).toBeDefined();
      
      cmd.undo();
      expect(plane.getCircle(circleId)).toBeUndefined();

      cmd.redo();
      expect(plane.getCircle(circleId)).toBeDefined();
    });

    it('should maintain stable IDs across undo/redo', () => {
      const cmd = new Command("Create circle", world);
      
      const centerResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
      const circumferenceResult = cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(150, 100, 1)));
      const circleResult = cmd.addAndExecute(new AddCircle2DByCenterAndPointOp(
        planeId,
        centerResult.outputs.pointId!,
        circumferenceResult.outputs.pointId!
      ));
      cmd.commit();
      
      const originalCircleId = circleResult.outputs.circleId!;
      
      cmd.undo();
      cmd.redo();
      
      const plane = world.projectionPlanes.get(planeId)!;
      const circle = plane.getCircle(originalCircleId);
      expect(circle?.id).toBe(originalCircleId);
    });
  });
});
