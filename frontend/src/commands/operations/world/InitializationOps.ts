/**
 * Initialization Operations for World setup
 * 
 * Phase 47: Operations for setting up World's fixed elements (planes, origins, hinge lines)
 * These operations are used by InitializeWorldCommand to create the basic geometry structure
 * that every World instance needs.
 * 
 * Operations:
 * - AddPlane3DOp: Create a 3D plane (P_H or P_V)
 * - AddProjectionPlaneOp: Create a projection plane
 * - AddOriginPoint2DOp: Create a locked origin point
 * - AddHingeLineOp: Create a hinge line connecting two planes
 * - AddHalfHingeLine2DOp: Create a half hinge line on a projection plane
 * 
 * These are simple atomic operations - the orchestration happens in InitializeWorldCommand.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §World Initialization
 */

import { Vector3 } from 'three';
import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Plane3D } from '@/domain/world/Plane';
import { BaseProjectionPlane } from '@/domain/world/ProjectionPlane';
import { FreePoint2D } from '@/domain/world/Point';
import { HingeLine, HalfHingeLine2D } from '@/domain/world/HingeLine';

/**
 * AddPlane3DOp - Create a 3D plane
 * 
 * Creates either horizontal (P_H) or vertical (P_V) 3D plane.
 */
export class AddPlane3DOp implements IOperation {
  readonly type = 'AddPlane3D';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly planeId: string,
    private readonly orientation: 'horizontal' | 'vertical'
  ) {
    this.parameters = { planeId, orientation };
  }

  apply(world: World): OperationResult {
    try {
      // Create 3D plane
      const plane = this.orientation === 'horizontal' 
        ? Plane3D.createPH() 
        : Plane3D.createPV();
      
      plane.id = this.planeId;
      
      // Add to world
      (world as any).planes.set(this.planeId, plane);
      
      return {
        success: true,
        outputs: { planeId: this.planeId }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create 3D plane: ${(error as Error).message}`,
        outputs: {}
      };
    }
  }

  undo(world: World): void {
    (world as any).planes.delete(this.planeId);
  }

  serialize() {
    return {
      type: this.type,
      planeId: this.planeId,
      orientation: this.orientation
    };
  }
}

/**
 * AddProjectionPlaneOp - Create a projection plane
 * 
 * Creates a projection plane (proj_plane_1, proj_plane_2, etc.) associated with a 3D plane.
 */
export class AddProjectionPlaneOp implements IOperation {
  readonly type = 'AddProjectionPlane';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(
    private readonly projPlaneId: string,
    private readonly plane3DId: string,
    private readonly orientation: 'horizontal' | 'vertical'
  ) {
    this.parameters = { projPlaneId, plane3DId, orientation };
  }

  apply(world: World): OperationResult {
    try {
      // Create projection plane
      const projPlane = this.orientation === 'horizontal'
        ? BaseProjectionPlane.createPH()
        : BaseProjectionPlane.createPV();
      
      projPlane.id = this.projPlaneId;
      projPlane.plane3DId = this.plane3DId;
      
      // Add to world
      (world as any).projectionPlanes.set(this.projPlaneId, projPlane);
      
      // Set semantic reference on World (Phase 46)
      if (this.orientation === 'horizontal') {
        (world as any).horizontalPlaneId = this.projPlaneId;
      } else {
        (world as any).verticalPlaneId = this.projPlaneId;
      }
      
      return {
        success: true,
        outputs: { projPlaneId: this.projPlaneId }
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
    (world as any).projectionPlanes.delete(this.projPlaneId);
    
    // Clear semantic reference
    if (this.orientation === 'horizontal') {
      (world as any).horizontalPlaneId = undefined;
    } else {
      (world as any).verticalPlaneId = undefined;
    }
  }

  serialize() {
    return {
      type: this.type,
      projPlaneId: this.projPlaneId,
      plane3DId: this.plane3DId,
      orientation: this.orientation
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
    private readonly position: Vector3 = new Vector3(0, 0, 1)
  ) {
    this.parameters = {
      projPlaneId,
      position: { x: position.x, y: position.y, z: position.z }
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
      
      // Generate ID for origin point
      const pointId = projPlane.generatePoint2DId(world);
      
      // Create locked origin point
      const originPoint = new FreePoint2D(pointId, this.position, this.projPlaneId);
      originPoint.locked = true;
      
      // Add to projection plane
      projPlane.addPoint(originPoint);
      
      // Set semantic reference on World (Phase 46)
      // Check if this is the horizontal or vertical plane to set the correct origin ID
      const horizontalPlane = world.getHorizontalPlane();
      const verticalPlane = world.getVerticalPlane();
      
      if (horizontalPlane && projPlane.id === horizontalPlane.id) {
        (world as any).horizontalOriginId = pointId;
      } else if (verticalPlane && projPlane.id === verticalPlane.id) {
        (world as any).verticalOriginId = pointId;
      }
      
      return {
        success: true,
        outputs: { pointId, projPlaneId: this.projPlaneId }
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
        
        // Clear semantic reference
        const horizontalPlane = world.getHorizontalPlane();
        const verticalPlane = world.getVerticalPlane();
        
        if (horizontalPlane && projPlane.id === horizontalPlane.id) {
          (world as any).horizontalOriginId = undefined;
        } else if (verticalPlane && projPlane.id === verticalPlane.id) {
          (world as any).verticalOriginId = undefined;
        }
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
    private readonly hingeLineId: string,
    private readonly horizontalPlaneId: string,
    private readonly verticalPlaneId: string
  ) {
    this.parameters = { hingeLineId, horizontalPlaneId, verticalPlaneId };
  }

  apply(world: World): OperationResult {
    try {
      // Create hinge line
      const hingeLine = new HingeLine(
        this.hingeLineId,
        this.hingeLineId, // label same as ID
        this.horizontalPlaneId,
        this.verticalPlaneId
      );
      
      // Add to world
      (world as any).hingeLines.set(this.hingeLineId, hingeLine);
      
      // Store as main hinge line reference
      (world as any).mainHingeLineId = this.hingeLineId;
      
      return {
        success: true,
        outputs: { hingeLineId: this.hingeLineId }
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
    (world as any).hingeLines.delete(this.hingeLineId);
    (world as any).mainHingeLineId = undefined;
  }

  serialize() {
    return {
      type: this.type,
      hingeLineId: this.hingeLineId,
      horizontalPlaneId: this.horizontalPlaneId,
      verticalPlaneId: this.verticalPlaneId
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
      
      // Generate ID for half hinge line
      const lineId = projPlane.generateLine2DId(world);
      
      // Create half hinge line
      const halfHingeLine = new HalfHingeLine2D(
        lineId,
        this.hingeLineId,
        this.projPlaneId,
        this.point,
        this.direction
      );
      
      // Add to projection plane
      projPlane.addLine(halfHingeLine);
      
      return {
        success: true,
        outputs: { lineId, projPlaneId: this.projPlaneId }
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

  undo(world: World): void {
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
