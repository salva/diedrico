/**
 * Unit tests for World initialization operations (Phase 47, updated Phase 83)
 * 
 * Tests all 6 initialization operation classes:
 * - AddPlane3DFixedOp (formerly AddPlane3DOp)
 * - AddProjectionPlaneFixedOp (formerly AddProjectionPlaneOp)
 * - AddOriginPoint2DOp
 * - AddHingeLineOp
 * - AddHalfHingeLine2DOp
 * - CreateInitializationSubprocessOp
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Vector4, Matrix3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import { World } from '@/domain/world/World';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import {
  AddPlane3DFixedOp,
  AddProjectionPlaneFixedOp,
  AddOriginPoint2DOp,
  AddHingeLineOp,
  AddHalfHingeLine2DOp,
  CreateInitializationSubprocessOp
} from '@/commands/operations/world/InitializationOps';

describe('Initialization Operations', () => {
  let world: World;

  // Helper functions to create standard transformation matrices
  function createPHMatrices() {
    const planeToPaper = new Matrix3().set(
      1, 0, 800,
      0, 1, 500,
      0, 0, 1
    );
    const planeTo3D = new Matrix4x3().set(
      1, 0, 0,
      0, 1, 0,
      0, 0, 0,
      0, 0, 1
    );
    const threeDToPlane = new Matrix3x4().set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    );
    return { planeToPaper, planeTo3D, threeDToPlane };
  }

  function createPVMatrices() {
    const planeToPaper = new Matrix3().set(
      1, 0, 800,
      0, -1, 500,
      0, 0, 1
    );
    const planeTo3D = new Matrix4x3().set(
      1, 0, 0,
      0, 0, 0,
      0, 1, 0,
      0, 0, 1
    );
    const threeDToPlane = new Matrix3x4().set(
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    return { planeToPaper, planeTo3D, threeDToPlane };
  }

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
        opType: 'CreateInitializationSubprocess',
        subprocessName: 'Test',
        subprocessId: undefined
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
      expect(result.outputs.planeId).toBeDefined();
      
      // Phase 78: AddPlane3DFixedOp creates Plane3D, not ProjectionPlane
      const plane = world.getPlaneById(result.outputs.planeId);
      expect(plane).toBeDefined();
      expect(plane!.label).toBe('P_H');
    });

    it('should create vertical 3D plane', () => {
      const point = new Vector4(0, 0, 0, 1);   // Homogeneous: point
      const normal = new Vector4(0, 1, 0, 0);  // Homogeneous: vector
      const op = new AddPlane3DFixedOp(point, normal, 'plane_test_V', 'P_V');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.planeId).toBeDefined();
      
      // Phase 78: AddPlane3DFixedOp creates Plane3D, not ProjectionPlane
      const plane = world.getPlaneById(result.outputs.planeId);
      expect(plane).toBeDefined();
      expect(plane!.label).toBe('P_V');
    });

    it('should undo plane creation', () => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      const op = new AddPlane3DFixedOp(point, normal, 'plane_undo_test');
      const result = op.apply(world);
      
      // Phase 78: AddPlane3DFixedOp creates Plane3D, not ProjectionPlane
      expect(world.getPlaneById(result.outputs.planeId)).toBeDefined();
      
      op.undo(world);
      
      expect(world.getPlaneById(result.outputs.planeId)).toBeUndefined();
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
      
      expect(serialized.opType).toBe('AddPlane3DFixed');
      expect(serialized.point).toEqual([0, 0, 0, 1]);
      expect(serialized.normal).toEqual([0, 1, 0, 0]);
      expect(serialized.planeId).toBe('plane_ser');
      expect(serialized.label).toBe('P_V');
    });
  });

  describe('AddProjectionPlaneFixedOp', () => {
    beforeEach(() => {
      // Create 3D plane first
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      new AddPlane3DFixedOp(point, normal, 'plane_3d_test', 'P_H').apply(world);
    });

    it('should create projection plane with explicit matrices', () => {
      const matrices = createPHMatrices();
      const op = new AddProjectionPlaneFixedOp(
        'plane_3d_test',
        matrices.planeToPaper,
        matrices.planeTo3D,
        'proj_plane_test',  // Phase 94: threeDToPlane removed, this is projPlaneId
        'P_H'  // Optional name
      );
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.projPlaneId).toBe('proj_plane_test');
      
      const projPlane = world.getProjectionPlaneById('proj_plane_test');
      expect(projPlane).toBeDefined();
      expect(projPlane?.id).toBe('proj_plane_test');
    });

    it('should undo projection plane creation', () => {
      const matrices = createPHMatrices();
      const op = new AddProjectionPlaneFixedOp(
        'plane_3d_test',
        matrices.planeToPaper,
        matrices.planeTo3D,
        'proj_undo'  // Phase 94: threeDToPlane removed, this is projPlaneId
      );
      op.apply(world);
      
      expect(world.getProjectionPlaneById('proj_undo')).toBeDefined();
      
      op.undo(world);
      
      expect(world.getProjectionPlaneById('proj_undo')).toBeUndefined();
    });

    it('should have valid parameters with matrix arrays', () => {
      const matrices = createPVMatrices();
      const op = new AddProjectionPlaneFixedOp(
        'plane_3d',
        matrices.planeToPaper,
        matrices.planeTo3D,
        'proj_test'  // Phase 94: threeDToPlane removed, this is projPlaneId
      );
      
      expect(op.parameters.plane3DId).toBe('plane_3d');
      expect(op.parameters.projPlaneId).toBe('proj_test');
      expect(op.parameters.planeToPaper2D).toBeDefined();
      expect(op.parameters.planeTo3D).toBeDefined();
      // Phase 94: threeDToPlane parameter removed, computed from planeTo3D
    });
  });

  describe('AddOriginPoint2DOp', () => {
    beforeEach(() => {
      const point = new Vector4(0, 0, 0, 1);
      const normal = new Vector4(0, 0, 1, 0);
      new AddPlane3DFixedOp(point, normal, 'plane_3d', 'P_H').apply(world);
      const matrices = createPHMatrices();
      new AddProjectionPlaneFixedOp('plane_3d', matrices.planeToPaper, matrices.planeTo3D, 'proj_plane').apply(world);  // Phase 94: threeDToPlane removed
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
      
      const matricesH = createPHMatrices();
      const matricesV = createPVMatrices();
      new AddProjectionPlaneFixedOp('plane_H', matricesH.planeToPaper, matricesH.planeTo3D, 'proj_H').apply(world);  // Phase 94: threeDToPlane removed
      new AddProjectionPlaneFixedOp('plane_V', matricesV.planeToPaper, matricesV.planeTo3D, 'proj_V').apply(world);  // Phase 94: threeDToPlane removed
    });

    it('should create hinge line', () => {
      const op = new AddHingeLineOp('proj_H', 'proj_V', 'hl_test');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.hingeLineId).toBe('hl_test');
      
      const hingeLine = world.getHingeLineById('hl_test');
      expect(hingeLine).toBeDefined();
      expect(hingeLine!.id).toBe('hl_test');
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
        opType: 'AddHingeLine',
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
      const matricesH = createPHMatrices();
      new AddProjectionPlaneFixedOp('plane_3d_h', matricesH.planeToPaper, matricesH.planeTo3D, 'proj_plane_h').apply(world);  // Phase 94: threeDToPlane removed

      new AddPlane3DFixedOp(point, normal, 'plane_3d_v', 'P_V').apply(world);
      const matricesV = createPVMatrices();
      new AddProjectionPlaneFixedOp('plane_3d_v', matricesV.planeToPaper, matricesV.planeTo3D, 'proj_plane_v').apply(world);  // Phase 94: threeDToPlane removed

      // Parent hinge line must exist before creating half-hinge lines
      new AddHingeLineOp('proj_plane_h', 'proj_plane_v', 'hl_test').apply(world);
    });

    it('should create half hinge line', () => {
      const op = new AddHalfHingeLine2DOp('proj_plane_h', 'hl_test');
      const result = op.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs.lineId).toBeDefined();
      expect(result.outputs.projPlaneId).toBe('proj_plane_h');
      
      const projPlane = world.getProjectionPlaneById('proj_plane_h');
      const lines = projPlane!.getAllLines();
      
      expect(lines.length).toBe(1);
      expect(lines[0]).toBeInstanceOf(HalfHingeLine2D);
    });

    it('should return error if plane not found', () => {
      const op = new AddHalfHingeLine2DOp('nonexistent', 'hl');
      const result = op.apply(world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.outputs).toEqual({});
    });

    it('should have valid parameters', () => {
      const op = new AddHalfHingeLine2DOp('proj_plane_id', 'hinge_line_id');
      
      expect(op.parameters.projPlaneId).toBe('proj_plane_id');
      expect(op.parameters.hingeLineId).toBe('hinge_line_id');
    });
  });
});
