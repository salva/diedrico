/**
 * Tests for creating free points using Command + AddFreePoint2DOp
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from '../../../src/commands/Command';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import type { World } from '../../../src/domain/world/World';
import { createTestWorld, getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';
import { Vector3 } from 'three';

describe('Create Free Point Command', () => {
  let world: World;
  let visibilityModel;
  let operationContext;
  let planeId: string;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, operationContext: oc } = createTestWorld();
    world = w;

    visibilityModel = vm;    operationContext = oc;    planeId = getHorizontalPlaneId(world);
  });

  describe('validation', () => {
    it('should validate valid coordinates', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", operationContext);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));
      
      expect(result.success).toBe(true);
    });

    it.each([NaN, Infinity, -Infinity])('rejects nonfinite coordinates (%s) before mutation', (value) => {
      const plane = getHorizontalPlane(world);
      const before = plane.getAllPoints().length;
      const cmd = new Command('Invalid point', operationContext);
      expect(() => cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(value, 0, 1)))).toThrow(/finite/);
      expect(plane.getAllPoints()).toHaveLength(before);
    });

    it.each([NaN, Infinity, -Infinity])('rejects nonfinite moves (%s) without replacing the point', (value) => {
      const plane = getHorizontalPlane(world);
      const added = new AddFreePoint2DOp(planeId, new Vector3(2, 3, 1));
      const result = added.apply(operationContext);
      const id = result.outputs.pointId!;
      const before = plane.getPoint(id);
      const move = new UpdateFreePoint2DPositionOp(planeId, id, new Vector3(0, value, 1));
      expect(move.apply(operationContext).success).toBe(false);
      expect(plane.getPoint(id)).toBe(before);
    });

    it('captures move coordinates before a caller reuses its vector', () => {
      const op = new AddFreePoint2DOp(planeId, new Vector3(2, 3, 1));
      const id = op.apply(operationContext).outputs.pointId!;
      const position = new Vector3(4, 5, 1);
      const move = new UpdateFreePoint2DPositionOp(planeId, id, position);
      position.x = 900;
      expect(move.apply(operationContext).success).toBe(true);
      expect(move.serialize().newPosition).toEqual([4, 5, 1]);
    });

    it('owns a stable coordinate snapshot across caller mutation and redo', () => {
      const position = new Vector3(10, 20, 1);
      const op = new AddFreePoint2DOp(planeId, position);
      const cmd = new Command('Point', operationContext);
      const result = cmd.addAndExecute(op);
      cmd.commit();
      position.x = 999;
      expect(op.serialize().position).toEqual([10, 20, 1]);
      expect((getHorizontalPlane(world).getPoint(result.outputs.pointId!) as { position: Vector3 }).position).toEqual(new Vector3(10, 20, 1));
      cmd.undo();
      cmd.redo();
      expect(op.serialize().position).toEqual([10, 20, 1]);
    });
  });

  describe('execution', () => {
    it('should create a free point', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", operationContext);
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
      
      const cmd = new Command("Create free point", operationContext);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));

      expect(result.success).toBe(true);
      expect(result.outputs.pointId).toBeDefined();
      expect(typeof result.outputs.pointId).toBe('string');
    });

    it('should fail for invalid plane', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", operationContext);
      
      expect(() => {
        cmd.addAndExecute(new AddFreePoint2DOp('INVALID_PLANE', planePos));
      }).toThrow(/Plane not found/);
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const planePos = new Vector3(100, 200, 1);
      
      const cmd = new Command("Create free point", operationContext);
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
      
      const cmd = new Command("Create free point", operationContext);
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
      
      const cmd = new Command("Create free point", operationContext);
      const result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, planePos));

      const pointId = result.outputs.pointId!;
      const plane = getHorizontalPlane(world);
      const point = plane.getPoint(pointId);

      expect(point).toBeDefined();
      expect(point?.visualStyle?.visible).toBe(true);
    });
  });
});
