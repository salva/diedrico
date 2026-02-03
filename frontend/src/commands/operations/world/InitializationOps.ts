/**
 * Initialization Operations for World setup
 * 
 * Phase 47: Operations for setting up World's fixed elements (planes, origins, hinge lines)
 * These operations are used by InitializationSequenceFactory to create the basic geometry structure
 * that every World instance needs.
 * 
 * Operations:
 * - AddPlane3DFixedOp: Create a fixed 3D plane (P_H or P_V)
 * - AddProjectionPlaneOp: Create a projection plane
 * - AddOriginPoint2DOp: Create a locked origin point
 * - AddHingeLineOp: Create a hinge line connecting two planes
 * - AddHalfHingeLine2DOp: Create a half hinge line on a projection plane
 * 
 * These are simple atomic operations - the orchestration happens in InitializationSequenceFactory.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §World Initialization
 */

import { Vector3, Vector4, Matrix3 } from 'three';
import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Matrix4x3 } from '@/utils/threeUtils';

/**
 * AddPlane3DFixedOp - Create a fixed 3D plane
 * 
 * Creates a fixed 3D plane defined by point and normal vector.
 * 
 * @remarks This operation is typically used during world initialization.
 */
export class AddPlane3DFixedOp implements IOperation {
  readonly type = 'AddPlane3DFixed';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly point: Vector4,
    private readonly normal: Vector4,
    private readonly planeId?: string,
    private readonly label?: string
  ) {
    this.parameters = { 
      point: { x: point.x, y: point.y, z: point.z, w: point.w },
      normal: { x: normal.x, y: normal.y, z: normal.z, w: normal.w },
      planeId,
      label
    };
  }

  apply(world: World): OperationResult {
    try {
      // Call element factory method - it handles ID generation
      const plane = world.addPlane3DFixed(
        this.point.clone(),
        this.normal.clone(),
        this.planeId || this.outputs.planeId,
        this.label
      );
      
      // Store ID in outputs for redo support
      this.outputs = { planeId: plane.id };
      // Phase 95: Back-fill generated ID into parameters for persistence
      this.parameters.planeId = plane.id;

      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create fixed 3D plane: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(world: World): void {
    if (this.outputs.planeId) {
      // Phase 78: Access planes3D map, not 'planes'
      (world as any).planes3D.delete(this.outputs.planeId);
      world.getDependencyService().unregisterNode(this.outputs.planeId);
    }
  }

  serialize() {
    return {
      opType: this.type,
      point: [this.point.x, this.point.y, this.point.z, this.point.w],
      normal: [this.normal.x, this.normal.y, this.normal.z, this.normal.w],
      planeId: this.outputs.planeId || this.parameters.planeId,
      label: this.label
    };
  }
}

/**
 * AddProjectionPlaneFixedOp - Create a projection plane with explicit transformation matrices
 * 
 * Creates a projection plane (proj_plane_1, proj_plane_2, etc.) associated with a 3D plane.
 * Takes explicit transformation matrices instead of orientation string for generic plane creation.
 */
export class AddProjectionPlaneFixedOp implements IOperation {
  readonly type = 'AddProjectionPlaneFixed';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly plane3DId: string,
    private readonly planeToPaper2D: Matrix3,
    private readonly planeTo3D: Matrix4x3,
    private readonly projPlaneId?: string,
    private readonly name?: string
  ) {
    // Phase 94: threeDToPlane computed from planeTo3D in realization constructor
    this.parameters = { 
      plane3DId, 
      planeToPaper2D: planeToPaper2D.toArray(), 
      planeTo3D: planeTo3D.toArray(),
      projPlaneId,
      name
    };
  }

  apply(world: World): OperationResult {
    try {
      // Call element factory method - it handles ID generation and semantic references
      // Phase 94: Pass only forward matrices, derived matrices computed in realization
      const projPlane = world.addProjectionPlane(
        this.plane3DId,
        this.planeToPaper2D,
        this.planeTo3D,
        this.projPlaneId || this.outputs.projPlaneId,
        this.name
      );
      
      // Store ID in outputs for redo support
      this.outputs = { projPlaneId: projPlane.id };
      // Phase 95: Back-fill generated ID into parameters for persistence
      this.parameters.projPlaneId = projPlane.id;
      
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create projection plane: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(world: World): void {
    if (this.outputs.projPlaneId) {
      (world as any).projectionPlanes.delete(this.outputs.projPlaneId);
      world.getDependencyService().unregisterNode(this.outputs.projPlaneId);
    }
  }

  serialize() {
    // Phase 94: Omit both derived matrices (paperToPlane2D, threeDToPlane)
    // Storage: 21 numbers (9 + 12) instead of 42 numbers (9 + 9 + 12 + 12)
    return {
      opType: this.type,
      plane3DId: this.plane3DId,
      planeToPaper2D: this.planeToPaper2D.toArray(),
      planeTo3D: this.planeTo3D.toArray(),
      projPlaneId: this.outputs.projPlaneId || this.parameters.projPlaneId,
      name: this.name
    };
  }
}

/**
 * AddOriginPoint2DOp - Create a locked origin point on a projection plane
 * 
 * Creates the origin point (O_H or O_V) at (0,0) on a projection plane.
 * These points are locked and cannot be moved or deleted.
 */
export class AddOriginPoint2DOp implements IOperation {
  readonly type = 'AddOriginPoint2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly projPlaneId: string,
    private readonly position: Vector3 = new Vector3(0, 0, 1),
    private readonly label?: string
  ) {
    this.parameters = {
      projPlaneId,
      position: { x: position.x, y: position.y, z: position.z },
      label
    };
  }

  apply(world: World): OperationResult {
    try {
      const projPlane = world.getProjectionPlaneById(this.projPlaneId);
      if (!projPlane) {
        return {
          success: false,
          error: `Projection plane ${this.projPlaneId} not found`,
          outputs: {}
        };
      }
      
      // Call element factory method - it handles ID generation and locking
      const originPoint = projPlane.addOriginPoint2D(
        this.position, 
        world, 
        this.outputs.pointId,
        this.label
      );
      
      // Store ID in outputs for redo support
      this.outputs = { pointId: originPoint.id, projPlaneId: this.projPlaneId };
      // Phase 95: Back-fill generated ID into parameters for persistence
      this.parameters.pointId = originPoint.id;
      
      // Phase 53: No longer storing origin IDs in World - use label-based access instead

      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create origin point: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(world: World): void {
    const projPlane = world.getProjectionPlaneById(this.projPlaneId);
    if (projPlane) {
      // Get origin point (should be the first point added to plane)
      const points = projPlane.getAllPoints();
      if (points.length > 0) {
        const pointId = points[0].id;
        projPlane.removePoint(pointId);
        
        // Phase 53: No longer storing origin IDs in World - use label-based access instead
      }
    }
  }

  serialize() {
    return {
      opType: this.type,
      projPlaneId: this.projPlaneId,
      position: [this.position.x, this.position.y, this.position.z],
      // Ensure pointId is included from outputs if available
      pointId: this.outputs.pointId || this.parameters.pointId,
      label: this.label
    };
  }
}

/**
 * AddHingeLineOp - Create a hinge line connecting two projection planes
 * 
 * Creates the hinge line (HL_1, HL_2, etc.) that connects horizontal and vertical planes.
 */
export class AddHingeLineOp implements IOperation {
  readonly type = 'AddHingeLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly horizontalPlaneId: string,
    private readonly verticalPlaneId: string,
    private readonly hingeLineId?: string
  ) {
    this.parameters = { horizontalPlaneId, verticalPlaneId, hingeLineId };
  }

  apply(world: World): OperationResult {
    try {
      // Call element factory method - it handles ID generation and semantic references
      const hingeLine = world.addHingeLine(
        this.horizontalPlaneId,
        this.verticalPlaneId,
        this.hingeLineId || this.outputs.hingeLineId
      );
      
      // Store ID in outputs for redo support
      this.outputs = { hingeLineId: hingeLine.id };
      // Phase 95: Back-fill generated ID into parameters for persistence
      this.parameters.hingeLineId = hingeLine.id;
      
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create hinge line: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(world: World): void {
    if (this.outputs.hingeLineId) {
      (world as any).hingeLines.delete(this.outputs.hingeLineId);
      (world as any).mainHingeLineId = undefined;
    }
  }

  serialize() {
    return {
      opType: this.type,
      horizontalPlaneId: this.horizontalPlaneId,
      verticalPlaneId: this.verticalPlaneId,
      hingeLineId: this.outputs.hingeLineId || this.parameters.hingeLineId
    };
  }
}

/**
 * AddHalfHingeLine2DOp - Create a half hinge line on a projection plane
 * 
 * Creates the 2D line representation of the hinge line on a specific projection plane.
 * **Phase 84**: No geometry arguments - computed on demand from canonical coordinates.
 */
export class AddHalfHingeLine2DOp implements IOperation {
  readonly type = 'AddHalfHingeLine2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly projPlaneId: string,
    private readonly hingeLineId: string
  ) {
    this.parameters = {
      projPlaneId,
      hingeLineId
    };
  }

  apply(world: World): OperationResult {
    try {
      const projPlane = world.getProjectionPlaneById(this.projPlaneId);
      if (!projPlane) {
        return {
          success: false,
          error: `Projection plane ${this.projPlaneId} not found`,
          outputs: {}
        };
      }
      
      // Phase 84: Call element factory method without geometry - it handles ID generation
      const halfHingeLine = projPlane.addHalfHingeLine2D(
        this.hingeLineId,
        world,
        this.outputs.lineId
      );
      
      // Store ID in outputs for redo support
      this.outputs = { lineId: halfHingeLine.id, projPlaneId: this.projPlaneId };
      // Phase 95: Back-fill generated ID into parameters for persistence
      this.parameters.lineId = halfHingeLine.id;

      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create half hinge line: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(world: World): void {
    const projPlane = world.getProjectionPlaneById(this.projPlaneId);
    if (projPlane) {
      // Get half hinge line (should be the first line added to plane)
      const lines = projPlane.getAllLines();
      if (lines.length > 0) {
        projPlane.removeLine(lines[0].id);
      }
    }
  }

  serialize() {
    return {
      opType: this.type,
      projPlaneId: this.projPlaneId,
      hingeLineId: this.hingeLineId,
      lineId: this.outputs.lineId || this.parameters.lineId
    };
  }
}


/**
 * CreateInitializationSubprocessOp - Create "World Initialization" subprocess in ProcessTree
 * 
 * Creates a subprocess to organize all initialization actions.
 * This subprocess will contain all actions for setting up planes, origins, and hinge lines.
 */
export class CreateInitializationSubprocessOp implements IOperation {
  readonly type = 'CreateInitializationSubprocess';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly subprocessName: string = 'World Initialization'
  ) {
    this.parameters = { subprocessName };
  }

  apply(world: World): OperationResult {
    try {
      const processTree = world.getProcessTree();
      const subprocess = processTree.addSubprocess(this.subprocessName);
      
      // Store subprocess ID for future reference
      this.outputs = { subprocessId: subprocess.id };
      // Phase 95: Back-fill generated ID into parameters for persistence
      // Note: Subprocess creation usually doesn't take an ID in constructor so we can't easily rebuild it with specific ID
      // unless we update constructor. But Initialization sequences don't typically rely on subprocess ID.
      
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create initialization subprocess: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(_world: World): void {
    // Note: For now, we don't undo subprocess creation
    // This could be implemented by removing the subprocess from ProcessTree
    // but since this is a non-undoable command, it's not critical
  }

  serialize() {
    return {
      opType: this.type,
      subprocessName: this.subprocessName,
      subprocessId: this.outputs.subprocessId || this.parameters.subprocessId
    };
  }
}
