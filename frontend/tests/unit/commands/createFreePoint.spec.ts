/**
 * Tests for creating free points using Command + AddFreePoint2DOp
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import type { World } from '../../../src/domain/world/World';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';
import { Vector3 } from 'three';

describe('Create Free Point Command', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    planeId = getHorizontalPlaneId(world);
  });

  describe('validation', () => {
    it('should validate valid coordinates', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));
      
      expect(result.success).toBe(true);
    });

    it.skip('coordinate validation happens elsewhere', () => {
      // The AddFreePoint2DOp operation doesn't validate coordinates
      // Validation would happen in the UI or in a separate validation layer
    });
  });

  describe('execution', () => {
    it('should create a free point', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));

      expect(result.success).toBe(true);
      
      const pointId = result.outputs.pointId!;
      expect(pointId).toBeDefined();
      expect(pointId).toMatch(/point2d\d+/);  // Phase 95: camelCase format
      
      const plane = getHorizontalPlane(world);
      const point = plane.getPoint(pointId);
      
      expect(point).toBeDefined();
      expect(point?.id).toBe(pointId);
    });

    it('should return pointId in outputs', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));

      expect(result.success).toBe(true);
      expect(result.outputs.pointId).toBeDefined();
      expect(typeof result.outputs.pointId).toBe('string');
    });

    it('should fail for invalid plane', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      
      expect(() => {
        cmd.addAndExecute(new AddFreePoint2DOp('INVALID_PLANE', planePos));
      }).toThrow(/Plane not found/);
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));
      cmd.commit();
      
      const pointId = result.outputs.pointId!;
      const plane = getHorizontalPlane(world);
      
      expect(plane.getPoint(pointId)).toBeDefined();
      
      // Undo
      cmd.undo();
      expect(plane.getPoint(pointId)).toBeUndefined();

      // Redo  
      cmd.redo();
      expect(plane.getPoint(pointId)).toBeDefined();
    });

    it('should support redo by re-executing operations', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));
      cmd.commit();
      
      const pointId = result.outputs.pointId!;
      const plane = getHorizontalPlane(world);
      
      cmd.undo();
      expect(plane.getPoint(pointId)).toBeUndefined();

      cmd.redo();
      expect(plane.getPoint(pointId)).toBeDefined();
    });
  });

  describe('visual style', () => {
    it.skip('should create point with visual properties', () => {
      // TODO Phase 83: Re-enable when visualStyle is fully implemented
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", world);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));

      const pointId = result.outputs.pointId!;
      const plane = getHorizontalPlane(world);
      const point = plane.getPoint(pointId);

      expect(point).toBeDefined();
      expect(point?.visualStyle?.visible).toBe(true);
    });
  });
});
