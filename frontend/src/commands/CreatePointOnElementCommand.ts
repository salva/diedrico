/**
 * CreatePointOnElementCommand - Create a point constrained to lie on an element
 * 
 * This command creates a Point2DOnElement that is constrained to a host element
 * (segment, line, or circle). The point's position is determined by a parameter
 * value that represents its position along the element.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Point2DOnElement } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generatePointId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export interface CreatePointOnElementParams {
  hostElementId: string;
  parameter: number;     // Position along element (0-1 for segments, angle for circles, t for lines)
  planeId: string;
  actionId: string;      // The action that is creating this point
  name?: string;         // Optional custom name (auto-generated if not provided)
}

export class CreatePointOnElementCommand extends Command {
  private params: CreatePointOnElementParams;
  private worldStore: any;
  private pointId: string;

  constructor(params: CreatePointOnElementParams, worldStore: any) {
    super(generateCommandId(), `Create point on element ${params.hostElementId}`);
    this.params = params;
    this.worldStore = worldStore;
    this.pointId = generatePointId();
  }

  /**
   * Validate command parameters
   */
  validate(): { valid: boolean; error?: string } {
    // Check if host element exists
    const hostElement = this.worldStore.elements2D.get(this.params.hostElementId);
    if (!hostElement) {
      return { valid: false, error: `Host element ${this.params.hostElementId} does not exist` };
    }

    // Check if host element is on the same plane
    if (hostElement.planeId !== this.params.planeId) {
      return { valid: false, error: 'Host element must be on the same plane as the point' };
    }

    // Check if host element is a valid type (segment, line, or circle)
    const validKinds = ['Segment2DByPoints', 'Line2DByPoints', 'Line2DParallel', 
                        'Line2DPerpendicular', 'Circle2DCenterRadius', 'Circle2DCenterPoint', 
                        'Circle2DByThreePoints'];
    if (!validKinds.includes(hostElement.kind)) {
      return { valid: false, error: 'Host element must be a segment, line, or circle' };
    }

    // Check parameter is valid
    if (!isFinite(this.params.parameter)) {
      return { valid: false, error: 'Parameter must be a finite number' };
    }

    // For segments, parameter should be in [0, 1]
    if (hostElement.kind === 'Segment2DByPoints') {
      if (this.params.parameter < 0 || this.params.parameter > 1) {
        return { valid: false, error: 'Parameter for segment must be in range [0, 1]' };
      }
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
      // Create the Point2DOnElement element
      const point: Point2DOnElement = {
        id: this.pointId,
        kind: 'Point2DOnElement',
        name: this.params.name || this.pointId,
        planeId: this.params.planeId,
        createdBy: this.params.actionId,
        infeasible: false,
        hostElementId: this.params.hostElementId,
        parameter: this.params.parameter,
        visualStyle: {
          color: '#ff9800',  // Orange color for constrained points
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

      // Add dependency edges (point depends on host element)
      const depOp = new AddDependencyEdgesOp(
        generateOperationId(),
        [
          { from: this.params.hostElementId, to: this.pointId }
        ],
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
        error: error instanceof Error ? error.message : 'Failed to create point on element'
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
