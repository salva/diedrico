/**
 * CreateFreePointCommand - Create a free point at specified coordinates
 * 
 * This command creates a Point2DFree element on the specified plane.
 * The point is positioned at the given (x, y) coordinates.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Point2DFree } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generatePointId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export interface CreateFreePointParams {
  x: number;
  y: number;
  planeId: string;
  actionId: string;  // The action that is creating this point
  name?: string;     // Optional custom name (auto-generated if not provided)
}

export class CreateFreePointCommand extends Command {
  private params: CreateFreePointParams;
  private worldStore: any;
  private pointId: string;

  constructor(params: CreateFreePointParams, worldStore: any) {
    super(generateCommandId(), `Create free point at (${params.x}, ${params.y})`);
    this.params = params;
    this.worldStore = worldStore;
    this.pointId = generatePointId();
  }

  /**
   * Validate command parameters
   */
  validate(): { valid: boolean; error?: string } {
    // Check if plane exists
    const viewStore = (window as any).useViewStore?.();
    if (viewStore && !viewStore.planes.find((p: any) => p.id === this.params.planeId)) {
      return { valid: false, error: `Plane ${this.params.planeId} does not exist` };
    }

    // Check coordinates are valid numbers
    if (!isFinite(this.params.x) || !isFinite(this.params.y)) {
      return { valid: false, error: 'Coordinates must be finite numbers' };
    }

    return { valid: true };
  }

  /**
   * Execute the command by adding operations
   */
  execute(): OperationResult {
    // Validate first
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        outputs: {},
        error: validation.error
      };
    }

    try {
      // Create the Point2DFree element
      const point: Point2DFree = {
        id: this.pointId,
        kind: 'Point2DFree',
        name: this.params.name || this.pointId,
        planeId: this.params.planeId,
        createdBy: this.params.actionId,
        infeasible: false,
        x: this.params.x,
        y: this.params.y,
        visualStyle: {
          color: '#2196f3',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      // Add element to world
      const elementPath = `/world/elements2D/${this.pointId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        point,
        this.worldStore
      );

      const addResult = this.addAndExecute(addOp);
      if (!addResult.success) {
        return addResult;
      }

      // Add dependency edges (free point has no dependencies, but we need to add the node)
      // The point depends on nothing, but actions may depend on the point
      const depOp = new AddDependencyEdgesOp(
        generateOperationId(),
        [],  // No edges for free points (they have no dependencies)
        this.worldStore
      );

      const depResult = this.addAndExecute(depOp);
      if (!depResult.success) {
        return depResult;
      }

      // Commit the command
      this.commit();

      return {
        success: true,
        outputs: {
          pointId: this.pointId,
          elementPath: elementPath
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to create free point'
      };
    }
  }

  /**
   * Get the ID of the created point (useful after execution)
   */
  getPointId(): string {
    return this.pointId;
  }
}
