/**
 * WorldOperations - Operations that mutate the World domain model
 * 
 * These are atomic operations for adding, removing, and updating geometric elements.
 * Each operation stores both before and after state for reversibility.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §World Operations
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';
import type { Point2D } from '@/domain/world/Point';
import type { Line2D } from '@/domain/world/Line';
import { FreePoint2D, IntersectionPoint2D } from '@/domain/world/Point';
import { Line2DByTwoPoints, Line2DParallel, Line2DPerpendicular } from '@/domain/world/Line';
import { Vector3 } from 'three';

/**
 * Helper: Create Point2D from serialized data
 */
function createPointFromData(data: Record<string, any>): Point2D {
  if (data.type === 'free') {
    return new FreePoint2D(
      data.id,
      new Vector3(data.position.x, data.position.y, data.position.z),
      data.planeId,
      data.label
    );
  } else if (data.type === 'intersection') {
    return new IntersectionPoint2D(
      data.id,
      data.element1Id,
      data.element2Id,
      data.index,
      data.planeId,
      data.label
    );
  }
  
  throw new Error(`Unknown point type: ${data.type}`);
}

/**
 * Helper function to create Line2D from element data
 * Used by both AddElementOp and RemoveElementOp for consistency
 */
function createLineFromData(data: Record<string, any>): Line2D {
  if (data.type === 'by-two-points') {
    return new Line2DByTwoPoints(
      data.id,
      data.point1Id,
      data.point2Id,
      data.planeId,
      data.label
    );
  } else if (data.type === 'parallel') {
    return new Line2DParallel(
      data.id,
      data.referenceLineId,
      data.throughPointId,
      data.planeId,
      data.label
    );
  } else if (data.type === 'perpendicular') {
    return new Line2DPerpendicular(
      data.id,
      data.referenceLineId,
      data.throughPointId,
      data.planeId,
      data.label
    );
  }
  
  throw new Error(`Unknown line type: ${data.type}`);
}

/**
 * AddElementOp - Adds a new element to the World
 * 
 * Use for creating new points, lines, circles, etc.
 * Element data must include all required fields (id, type, construction params)
 */
export class AddElementOp implements IOperation {
  readonly type = 'AddElement';
  parameters: {
    elementType: 'point' | 'line';  // Extensible: 'circle' | 'segment'
    elementData: Record<string, any>;  // Full element definition
    beforeState: null;  // Element didn't exist before
  };
  outputs: Record<string, any> = {};

  constructor(elementType: 'point' | 'line', elementData: Record<string, any>) {
    this.parameters = {
      elementType,
      elementData,
      beforeState: null
    };
  }

  apply(world: World): OperationResult {
    try {
      const { elementType, elementData } = this.parameters;
      
      if (elementType === 'point') {
        // Create point from data
        const point = createPointFromData(elementData);
        
        // Add to world
        world.addPoint(point);
        
        // Store outputs
        this.outputs = {
          elementId: point.id,
          elementType: 'point',
          planeId: point.planeId
        };
        
        return {
          success: true,
          outputs: this.outputs
        };
      }
      
      if (elementType === 'line') {
        // Create line from data
        const line = createLineFromData(elementData);
        
        // Add to world
        world.addLine(line);
        
        // Store outputs
        this.outputs = {
          elementId: line.id,
          elementType: 'line',
          planeId: line.planeId
        };
        
        return {
          success: true,
          outputs: this.outputs
        };
      }
      
      return {
        success: false,
        outputs: {},
        error: `Unknown element type: ${elementType}`
      };
      
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    const { elementType } = this.parameters;
    const elementId = this.outputs.elementId;
    
    if (!elementId) {
      throw new Error('Cannot undo: no elementId in outputs');
    }
    
    if (elementType === 'point') {
      world.removePoint(elementId);
    } else if (elementType === 'line') {
      world.removeLine(elementId);
    }
  }
}

/**
 * RemoveElementOp - Removes an element from the World
 * 
 * Stores the complete element state before removal for undo.
 */
export class RemoveElementOp implements IOperation {
  readonly type = 'RemoveElement';
  parameters: {
    elementType: 'point';  // Extensible
    elementId: string;
    beforeState: Record<string, any>;  // Full element state for undo
  };
  outputs: Record<string, any> = {};

  constructor(elementType: 'point', elementId: string, beforeState: Record<string, any>) {
    this.parameters = {
      elementType,
      elementId,
      beforeState
    };
  }

  apply(world: World): OperationResult {
    try {
      const { elementType, elementId } = this.parameters;
      
      if (elementType === 'point') {
        world.removePoint(elementId);
        
        this.outputs = {
          elementId,
          elementType: 'point'
        };
        
        return {
          success: true,
          outputs: this.outputs
        };
      }
      
      return {
        success: false,
        outputs: {},
        error: `Unknown element type: ${elementType}`
      };
      
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    const { elementType, beforeState } = this.parameters;
    
    if (elementType === 'point') {
      // Recreate point from beforeState
      const point = createPointFromData(beforeState);
      world.addPoint(point);
    }
  }
}

/**
 * UpdateElementOp - Updates properties of an existing element
 * 
 * Stores both before and after state for undo/redo.
 * Currently focused on point updates, extensible to other elements.
 */
export class UpdateElementOp implements IOperation {
  readonly type = 'UpdateElement';
  parameters: {
    elementType: 'point';  // Extensible
    elementId: string;
    beforeState: Record<string, any>;  // Fields before change
    afterState: Record<string, any>;   // Fields after change
  };
  outputs: Record<string, any> = {};

  constructor(
    elementType: 'point',
    elementId: string,
    beforeState: Record<string, any>,
    afterState: Record<string, any>
  ) {
    this.parameters = {
      elementType,
      elementId,
      beforeState,
      afterState
    };
  }

  apply(world: World): OperationResult {
    try {
      const { elementType, elementId, afterState } = this.parameters;
      
      if (elementType === 'point') {
        const point = world.getPointById(elementId);
        if (!point) {
          return {
            success: false,
            outputs: {},
            error: `Point not found: ${elementId}`
          };
        }
        
        // Update point properties (currently limited to label, position for FreePoint2D)
        // For immutable properties like position, we'd need to recreate the point
        // This is a simplified implementation
        if (afterState.label !== undefined) {
          point.label = afterState.label;
        }
        
        this.outputs = {
          elementId,
          elementType: 'point'
        };
        
        return {
          success: true,
          outputs: this.outputs
        };
      }
      
      return {
        success: false,
        outputs: {},
        error: `Unknown element type: ${elementType}`
      };
      
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    const { elementType, elementId, beforeState } = this.parameters;
    
    if (elementType === 'point') {
      const point = world.getPointById(elementId);
      if (point) {
        // Restore before state
        if (beforeState.label !== undefined) {
          point.label = beforeState.label;
        }
      }
    }
  }
}
