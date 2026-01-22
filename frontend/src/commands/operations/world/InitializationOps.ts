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
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';
import {
  createInitializePlane3DAction,
  createInitializeProjectionPlaneAction,
  createInitializeOriginPoint2DAction,
  createInitializeHingeLineAction,
  createInitializeHalfHingeLine2DAction
} from '@/domain/processTree/actions/InitializeWorldActions';

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

      // ProcessTree integration (Phase 47): if the initialization subprocess exists, record init action
      const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
      if (initSubprocess) {
        world.addAction(createInitializePlane3DAction(plane.id, this.label), undefined, initSubprocess.id);
      }
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
      (world as any).planes.delete(this.outputs.planeId);
    }
  }

  serialize() {
    return {
      type: this.type,
      point: this.parameters.point,
      normal: this.parameters.normal,
      planeId: this.outputs.planeId,
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
    private readonly threeDToPlane: Matrix3x4,
    private readonly projPlaneId?: string,
    private readonly name?: string
  ) {
    this.parameters = { 
      plane3DId, 
      planeToPaper2D: planeToPaper2D.toArray(), 
      planeTo3D: planeTo3D.toArray(),
      threeDToPlane: threeDToPlane.toArray(),
      projPlaneId,
      name
    };
  }

  apply(world: World): OperationResult {
    try {
      // Call element factory method - it handles ID generation and semantic references
      const projPlane = world.addProjectionPlane(
        this.plane3DId,
        this.planeToPaper2D,
        this.planeTo3D,
        this.threeDToPlane,
        this.projPlaneId || this.outputs.projPlaneId,
        this.name
      );
      
      // Store ID in outputs for redo support
      this.outputs = { projPlaneId: projPlane.id };

      // ProcessTree integration (Phase 47): if the initialization subprocess exists, record init action
      const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
      if (initSubprocess) {
        world.addAction(
          createInitializeProjectionPlaneAction(projPlane.id, this.plane3DId, 'base'),
          undefined,
          initSubprocess.id
        );
      }
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
    }
  }

  serialize() {
    return {
      type: this.type,
      plane3DId: this.plane3DId,
      planeToPaper2D: this.planeToPaper2D.toArray(),
      planeTo3D: this.planeTo3D.toArray(),
      threeDToPlane: this.threeDToPlane.toArray(),
      projPlaneId: this.outputs.projPlaneId
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
      
      // Phase 53: No longer storing origin IDs in World - use label-based access instead
      
      // ProcessTree integration (Phase 47): if the initialization subprocess exists, record init action
      const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
      if (initSubprocess) {
        world.addAction(
          createInitializeOriginPoint2DAction(originPoint.id, this.projPlaneId, this.label),
          undefined,
          initSubprocess.id
        );
      }

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
      type: this.type,
      projPlaneId: this.projPlaneId,
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      }
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

      // ProcessTree integration (Phase 47): if the initialization subprocess exists, record init action
      const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
      if (initSubprocess) {
        world.addAction(
          createInitializeHingeLineAction(hingeLine.id, this.horizontalPlaneId, this.verticalPlaneId),
          undefined,
          initSubprocess.id
        );
      }
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
      type: this.type,
      horizontalPlaneId: this.horizontalPlaneId,
      verticalPlaneId: this.verticalPlaneId,
      hingeLineId: this.outputs.hingeLineId
    };
  }
}

/**
 * AddHalfHingeLine2DOp - Create a half hinge line on a projection plane
 * 
 * Creates the 2D line representation of the hinge line on a specific projection plane.
 * This is the horizontal line at v=0 on each plane.
 */
export class AddHalfHingeLine2DOp implements IOperation {
  readonly type = 'AddHalfHingeLine2D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly projPlaneId: string,
    private readonly hingeLineId: string,
    private readonly point: Vector3 = new Vector3(0, 0, 1),
    private readonly direction: Vector3 = new Vector3(1, 0, 0)
  ) {
    this.parameters = {
      projPlaneId,
      hingeLineId,
      point: { x: point.x, y: point.y, z: point.z },
      direction: { x: direction.x, y: direction.y, z: direction.z }
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
      
      // Call element factory method - it handles ID generation
      const halfHingeLine = projPlane.addHalfHingeLine2D(
        this.hingeLineId,
        this.point,
        this.direction,
        world,
        this.outputs.lineId
      );
      
      // Store ID in outputs for redo support
      this.outputs = { lineId: halfHingeLine.id, projPlaneId: this.projPlaneId };

      // ProcessTree integration (Phase 47): if the initialization subprocess exists, record init action
      const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
      if (initSubprocess) {
        world.addAction(
          createInitializeHalfHingeLine2DAction(halfHingeLine.id, this.projPlaneId, this.hingeLineId),
          undefined,
          initSubprocess.id
        );
      }
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
      type: this.type,
      projPlaneId: this.projPlaneId,
      hingeLineId: this.hingeLineId,
      point: {
        x: this.point.x,
        y: this.point.y,
        z: this.point.z
      },
      direction: {
        x: this.direction.x,
        y: this.direction.y,
        z: this.direction.z
      }
    };
  }
}

/**
 * SetActivePlaneOp - Set the active projection plane
 * 
 * Sets which projection plane is currently active for user interactions.
 * This is typically the horizontal plane initially.
 */
export class SetActivePlaneOp implements IOperation {
  readonly type = 'SetActivePlane';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(private readonly planeId: string) {
    this.parameters = { planeId };
  }

  apply(world: World): OperationResult {
    try {
      (world as any).setActivePlaneId(this.planeId);
      
      return {
        success: true,
        outputs: { activePlaneId: this.planeId }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set active plane: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(_world: World): void {
    // Active plane state is UI concern, no need to undo
    // (initialization is non-undoable anyway)
  }

  serialize() {
    return {
      type: this.type,
      planeId: this.planeId
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
      type: this.type,
      subprocessName: this.subprocessName
    };
  }
}
