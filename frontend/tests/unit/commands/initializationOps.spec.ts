/**
 * Unit tests for World initialization operations (Phase 47)
 * 
 * Tests all 6 initialization operation classes:
 * - AddPlane3DOp
 * - AddProjectionPlaneOp
 * - AddOriginPoint2DOp
 * - AddHingeLineOp
 * - AddHalfHingeLine2DOp
 * - CreateInitializationSubprocessOp
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '@/domain/world/World';
import {
  AddPlane3DOp,
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

  describe('AddPlane3DOp', () => {
    it('should create horizontal 3D plane', () => {
      const op = new AddPlane3DOp('plane_test_H', 'horizontal');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.planeId).toBe('plane_test_H');
      
      const plane = (world as any).planes.get('plane_test_H');
      expect(plane).toBeDefined();
      expect(plane.type).toBe('projection');
    });

    it('should create vertical 3D plane', () => {
      const op = new AddPlane3DOp('plane_test_V', 'vertical');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      
      const plane = (world as any).planes.get('plane_test_V');
      expect(plane).toBeDefined();
    });

    it('should undo plane creation', () => {
      const op = new AddPlane3DOp('plane_undo_test', 'horizontal');
      op.apply(world);
      
      expect((world as any).planes.has('plane_undo_test')).toBe(true);
      
      op.undo(world);
      
      expect((world as any).planes.has('plane_undo_test')).toBe(false);
    });

    it('should have valid parameters and outputs', () => {
      const op = new AddPlane3DOp('plane_test', 'horizontal');
      
      expect(op.parameters).toEqual({
        planeId: 'plane_test',
        orientation: 'horizontal'
      });
    });

    it('should serialize correctly', () => {
      const op = new AddPlane3DOp('plane_ser', 'vertical');
      const serialized = op.serialize();
      
      expect(serialized).toEqual({
        type: 'AddPlane3D',
        planeId: 'plane_ser',
        orientation: 'vertical'
      });
    });
  });

  describe('AddProjectionPlaneOp', () => {
    beforeEach(() => {
      // Create 3D plane first
      new AddPlane3DOp('plane_3d_test', 'horizontal').apply(world);
    });

    it('should create projection plane', () => {
      const op = new AddProjectionPlaneOp('proj_plane_test', 'plane_3d_test', 'horizontal');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.projPlaneId).toBe('proj_plane_test');
      
      const projPlane = world.getProjectionPlaneById('proj_plane_test');
      expect(projPlane).toBeDefined();
      expect(projPlane?.id).toBe('proj_plane_test');
    });

    it('should undo projection plane creation', () => {
      const op = new AddProjectionPlaneOp('proj_undo', 'plane_3d_test', 'horizontal');
      op.apply(world);
      
      expect(world.getProjectionPlaneById('proj_undo')).toBeDefined();
      
      op.undo(world);
      
      expect(world.getProjectionPlaneById('proj_undo')).toBeUndefined();
    });

    it('should have valid parameters', () => {
      const op = new AddProjectionPlaneOp('proj_test', 'plane_3d', 'vertical');
      
      expect(op.parameters).toEqual({
        projPlaneId: 'proj_test',
        plane3DId: 'plane_3d',
        orientation: 'vertical'
      });
    });
  });

  describe('AddOriginPoint2DOp', () => {
    beforeEach(() => {
      new AddPlane3DOp('plane_3d', 'horizontal').apply(world);
      new AddProjectionPlaneOp('proj_plane', 'plane_3d', 'horizontal').apply(world);
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
      new AddPlane3DOp('plane_H', 'horizontal').apply(world);
      new AddPlane3DOp('plane_V', 'vertical').apply(world);
      new AddProjectionPlaneOp('proj_H', 'plane_H', 'horizontal').apply(world);
      new AddProjectionPlaneOp('proj_V', 'plane_V', 'vertical').apply(world);
    });

    it('should create hinge line', () => {
      const op = new AddHingeLineOp('hl_test', 'proj_H', 'proj_V');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.hingeLineId).toBe('hl_test');
      
      const hingeLine = (world as any).hingeLines.get('hl_test');
      expect(hingeLine).toBeDefined();
      expect((world as any).mainHingeLineId).toBe('hl_test');
    });

    it('should undo hinge line creation', () => {
      const op = new AddHingeLineOp('hl_undo', 'proj_H', 'proj_V');
      op.apply(world);
      
      expect((world as any).hingeLines.has('hl_undo')).toBe(true);
      
      op.undo(world);
      
      expect((world as any).hingeLines.has('hl_undo')).toBe(false);
      expect((world as any).mainHingeLineId).toBeUndefined();
    });

    it('should serialize correctly', () => {
      const op = new AddHingeLineOp('hl_ser', 'proj_1', 'proj_2');
      const serialized = op.serialize();
      
      expect(serialized).toEqual({
        type: 'AddHingeLine',
        hingeLineId: 'hl_ser',
        horizontalPlaneId: 'proj_1',
        verticalPlaneId: 'proj_2'
      });
    });
  });

  describe('AddHalfHingeLine2DOp', () => {
    beforeEach(() => {
      new AddPlane3DOp('plane_3d', 'horizontal').apply(world);
      new AddProjectionPlaneOp('proj_plane', 'plane_3d', 'horizontal').apply(world);
    });

    it('should create half hinge line', () => {
      const point = new Vector3(0, 0, 1);
      const direction = new Vector3(1, 0, 0);
      const op = new AddHalfHingeLine2DOp('proj_plane', 'hl_test', point, direction);
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.lineId).toBeDefined();
      expect(result.outputs.projPlaneId).toBe('proj_plane');
      
      const projPlane = world.getProjectionPlaneById('proj_plane');
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
