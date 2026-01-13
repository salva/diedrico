/**
 * Unit tests for World initialization operations (Phase 47, updated Phase 28)
 * 
 * Tests all 6 initialization operation classes:
 * - AddPlane3DFixedOp (formerly AddPlane3DOp)
 * - AddProjectionPlaneOp
 * - AddOriginPoint2DOp
 * - AddHingeLineOp
 * - AddHalfHingeLine2DOp
 * - CreateInitializationSubprocessOp
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { World } from '@/domain/world/World';
import {
  AddPlane3DFixedOp,
  AddProjectionPlaneOp,
  AddOriginPoint2DOp,
  AddHingeLineOp,
  AddHalfHingeLine2DOp,
  CreateInitializationSubprocessOp
} from '@/commands/operations/world/InitializationOps';

describe('Initialization Operations', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    // Clear the world to remove default initialization
    world.clear();
  });

  describe('CreateInitializationSubprocessOp', () => {
    it('should create subprocess in ProcessTree', () => {
      const op = new CreateInitializationSubprocessOp('Test Initialization');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.subprocessId).toBeDefined();
      
      const processTree = world.getProcessTree();
      const subprocess = processTree.root.children.find(
        (child) => child.type === 'subprocess' && child.id === result.outputs.subprocessId
      );
      
      expect(subprocess).toBeDefined();
      expect(subprocess?.type).toBe('subprocess');
    });

    it('should have valid parameters and outputs', () => {
      const op = new CreateInitializationSubprocessOp('Custom Name');
      
      expect(op.parameters).toEqual({ subprocessName: 'Custom Name' });
      expect(op.outputs).toEqual({});
    });

    it('should serialize correctly', () => {
      const op = new CreateInitializationSubprocessOp('Test');
      const serialized = op.serialize();
      
      expect(serialized).toEqual({
        type: 'CreateInitializationSubprocess',
        subprocessName: 'Test'
      });
    });
  });

  describe('AddPlane3DFixedOp', () => {
    it('should create horizontal 3D plane', () => {
      const point = new Vector4(0, 0, 0, 1);   // Homogeneous: point
      const normal = new Vector4(0, 0, 1, 0);  // Homogeneous: vector
      const op = new AddPlane3DFixedOp(point, normal, 'plane_test_H', 'P_H');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.planeId).toBe('plane_test_H');
      
      const plane = (world as any).planes.get('plane_test_H');
      expect(plane).toBeDefined();
      expect(plane.type).toBe('projection');
      expect(plane.label).toBe('P_H');
    });

    it('should create vertical 3D plane', () => {
      const point = new Vector4(0, 0, 0, 1);   // Homogeneous: point
      const normal = new Vector4(0, 1, 0, 0);  // Homogeneous: vector
      const op = new AddPlane3DFixedOp(point, normal, 'plane_test_V', 'P_V');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      
      const plane = (world as any).planes.get('plane_test_V');
      expect(plane).toBeDefined();
      expect(plane.label).toBe('P_V');
    });

    it('should undo plane creation', () => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      const op = new AddPlane3DFixedOp(point, normal, 'plane_undo_test');
      op.apply(world);
      
      expect((world as any).planes.has('plane_undo_test')).toBe(true);
      
      op.undo(world);
      
      expect((world as any).planes.has('plane_undo_test')).toBe(false);
    });

    it('should have valid parameters and outputs', () => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      const op = new AddPlane3DFixedOp(point, normal, 'plane_test');
      
      expect(op.parameters.point).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(op.parameters.normal).toEqual({ x: 0, y: 0, z: 1, w: 0 });
      expect(op.parameters.planeId).toBe('plane_test');
    });

    it('should serialize correctly', () => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 1, 0, 0);
      const op = new AddPlane3DFixedOp(point, normal, 'plane_ser', 'P_V');
      op.apply(world); // Need to apply to populate outputs
      const serialized = op.serialize();
      
      expect(serialized.type).toBe('AddPlane3DFixed');
      expect(serialized.point).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(serialized.normal).toEqual({ x: 0, y: 1, z: 0, w: 0 });
      expect(serialized.planeId).toBe('plane_ser');
      expect(serialized.label).toBe('P_V');
    });
  });

  describe('AddProjectionPlaneOp', () => {
    beforeEach(() => {
      // Create 3D plane first
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      new AddPlane3DFixedOp(point, normal, 'plane_3d_test', 'P_H').apply(world);
    });

    it('should create projection plane', () => {
      const op = new AddProjectionPlaneOp('plane_3d_test', 'horizontal', 'proj_plane_test');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.projPlaneId).toBe('proj_plane_test');
      
      const projPlane = world.getProjectionPlaneById('proj_plane_test');
      expect(projPlane).toBeDefined();
      expect(projPlane?.id).toBe('proj_plane_test');
    });

    it('should undo projection plane creation', () => {
      const op = new AddProjectionPlaneOp('plane_3d_test', 'horizontal', 'proj_undo');
      op.apply(world);
      
      expect(world.getProjectionPlaneById('proj_undo')).toBeDefined();
      
      op.undo(world);
      
      expect(world.getProjectionPlaneById('proj_undo')).toBeUndefined();
    });

    it('should have valid parameters', () => {
      const op = new AddProjectionPlaneOp('plane_3d', 'vertical', 'proj_test');
      
      expect(op.parameters).toEqual({
        plane3DId: 'plane_3d',
        orientation: 'vertical',
        projPlaneId: 'proj_test'
      });
    });
  });

  describe('AddOriginPoint2DOp', () => {
    beforeEach(() => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      new AddPlane3DFixedOp(point, normal, 'plane_3d', 'P_H').apply(world);
      new AddProjectionPlaneOp('plane_3d', 'horizontal', 'proj_plane').apply(world);
    });

    it('should create locked origin point', () => {
      const position = new Vector3(0, 0, 1);
      const op = new AddOriginPoint2DOp('proj_plane', position);
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.pointId).toBeDefined();
      expect(result.outputs.projPlaneId).toBe('proj_plane');
      
      const projPlane = world.getProjectionPlaneById('proj_plane');
      const points = projPlane!.getAllPoints();
      
      expect(points.length).toBe(1);
      expect(points[0].locked).toBe(true);
      expect(points[0].position.x).toBe(0);
      expect(points[0].position.y).toBe(0);
    });

    it('should return error if plane not found', () => {
      const op = new AddOriginPoint2DOp('nonexistent_plane', new Vector3(0, 0, 1));
      const result = op.apply(world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.outputs).toEqual({});
    });

    it('should have valid parameters', () => {
      const position = new Vector3(1, 2, 1);
      const op = new AddOriginPoint2DOp('proj', position);
      
      expect(op.parameters.projPlaneId).toBe('proj');
      expect(op.parameters.position).toEqual({ x: 1, y: 2, z: 1 });
    });
  });

  describe('AddHingeLineOp', () => {
    beforeEach(() => {
      const pointH = new Vector4(0, 0, 0, 1);
      const normalH = new Vector4(0, 0, 1, 0);
      new AddPlane3DFixedOp(pointH, normalH, 'plane_H', 'P_H').apply(world);
      
      const pointV = new Vector4(0, 0, 0, 1);
      const normalV = new Vector4(0, 1, 0, 0);
      new AddPlane3DFixedOp(pointV, normalV, 'plane_V', 'P_V').apply(world);
      
      new AddProjectionPlaneOp('plane_H', 'horizontal', 'proj_H').apply(world);
      new AddProjectionPlaneOp('plane_V', 'vertical', 'proj_V').apply(world);
    });

    it('should create hinge line', () => {
      const op = new AddHingeLineOp('proj_H', 'proj_V', 'hl_test');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.hingeLineId).toBe('hl_test');
      
      const hingeLine = (world as any).hingeLines.get('hl_test');
      expect(hingeLine).toBeDefined();
      expect((world as any).mainHingeLineId).toBe('hl_test');
    });

    it('should undo hinge line creation', () => {
      const op = new AddHingeLineOp('proj_H', 'proj_V', 'hl_undo');
      op.apply(world);
      
      expect((world as any).hingeLines.has('hl_undo')).toBe(true);
      
      op.undo(world);
      
      expect((world as any).hingeLines.has('hl_undo')).toBe(false);
      expect((world as any).mainHingeLineId).toBeUndefined();
    });

    it('should serialize correctly', () => {
      const op = new AddHingeLineOp('proj_1', 'proj_2', 'hl_ser');
      op.apply(world); // Need to apply to populate outputs
      const serialized = op.serialize();
      
      expect(serialized).toEqual({
        type: 'AddHingeLine',
        horizontalPlaneId: 'proj_1',
        verticalPlaneId: 'proj_2',
        hingeLineId: 'hl_ser'
      });
    });
  });

  describe('AddHalfHingeLine2DOp', () => {
    beforeEach(() => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);

      // Create two distinct planes so hinge line construction is valid
      new AddPlane3DFixedOp(point, normal, 'plane_3d_h', 'P_H').apply(world);
      new AddProjectionPlaneOp('plane_3d_h', 'horizontal', 'proj_plane_h').apply(world);

      new AddPlane3DFixedOp(point, normal, 'plane_3d_v', 'P_V').apply(world);
      new AddProjectionPlaneOp('plane_3d_v', 'vertical', 'proj_plane_v').apply(world);

      // Parent hinge line must exist before creating half-hinge lines
      new AddHingeLineOp('proj_plane_h', 'proj_plane_v', 'hl_test').apply(world);
    });

    it('should create half hinge line', () => {
      const point = new Vector3(0, 0, 1);
      const direction = new Vector3(1, 0, 0);
      const op = new AddHalfHingeLine2DOp('proj_plane_h', 'hl_test', point, direction);
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.lineId).toBeDefined();
      expect(result.outputs.projPlaneId).toBe('proj_plane_h');
      
      const projPlane = world.getProjectionPlaneById('proj_plane_h');
      const lines = projPlane!.getAllLines();
      
      expect(lines.length).toBe(1);
      expect(lines[0].type).toBe('half-hinge');
    });

    it('should return error if plane not found', () => {
      const op = new AddHalfHingeLine2DOp('nonexistent', 'hl', new Vector3(0, 0, 1), new Vector3(1, 0, 0));
      const result = op.apply(world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.outputs).toEqual({});
    });

    it('should have valid parameters', () => {
      const point = new Vector3(1, 2, 1);
      const dir = new Vector3(3, 4, 0);
      const op = new AddHalfHingeLine2DOp('proj', 'hl', point, dir);
      
      expect(op.parameters.projPlaneId).toBe('proj');
      expect(op.parameters.hingeLineId).toBe('hl');
      expect(op.parameters.point).toEqual({ x: 1, y: 2, z: 1 });
      expect(op.parameters.direction).toEqual({ x: 3, y: 4, z: 0 });
    });
  });
});
