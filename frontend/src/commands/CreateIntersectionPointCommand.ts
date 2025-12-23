/**
 * CreateIntersectionPointCommand - Create a point at the intersection of two elements
 * 
 * This command creates a Point2DFromIntersection at the intersection of two
 * geometric elements (lines, segments, circles). If no intersection exists,
 * the point is marked as infeasible.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Point2DFromIntersection } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generatePointId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export interface CreateIntersectionPointParams {
  element1Id: string;
  element2Id: string;
  intersectionIndex: number;  // Which intersection (0 or 1 for line-circle, 0 or 1 for circle-circle)
  planeId: string;
  actionId: string;           // The action that is creating this point
  name?: string;              // Optional custom name (auto-generated if not provided)
}

export class CreateIntersectionPointCommand extends Command {
  private params: CreateIntersectionPointParams;
  private worldStore: any;
  private pointId: string;

  constructor(params: CreateIntersectionPointParams, worldStore: any) {
    super(
      generateCommandId(), 
      `Create intersection point of ${params.element1Id} and ${params.element2Id}`
    );
    this.params = params;
    this.worldStore = worldStore;
    this.pointId = generatePointId();
  }

  /**
   * Validate command parameters
   */
  validate(): { valid: boolean; error?: string } {
    // Check if both elements exist
    const element1 = this.worldStore.elements2D.get(this.params.element1Id);
    if (!element1) {
      return { valid: false, error: `Element ${this.params.element1Id} does not exist` };
    }

    const element2 = this.worldStore.elements2D.get(this.params.element2Id);
    if (!element2) {
      return { valid: false, error: `Element ${this.params.element2Id} does not exist` };
    }

    // Check if both elements are on the same plane
    if (element1.planeId !== this.params.planeId || element2.planeId !== this.params.planeId) {
      return { valid: false, error: 'Both elements must be on the same plane' };
    }

    // Check if elements are different
    if (this.params.element1Id === this.params.element2Id) {
      return { valid: false, error: 'Cannot create intersection of an element with itself' };
    }

    // Check if intersection index is valid (0 or 1)
    if (this.params.intersectionIndex !== 0 && this.params.intersectionIndex !== 1) {
      return { valid: false, error: 'Intersection index must be 0 or 1' };
    }

    // Check if elements are valid types for intersection
    const validKinds = ['Segment2DByPoints', 'Line2DByPoints', 'Line2DParallel', 
                        'Line2DPerpendicular', 'Circle2DCenterRadius', 'Circle2DCenterPoint', 
                        'Circle2DByThreePoints'];
    if (!validKinds.includes(element1.kind) || !validKinds.includes(element2.kind)) {
      return { valid: false, error: 'Elements must be segments, lines, or circles' };
    }

    return { valid: true };
  }

  /**
   * Check if intersection actually exists
   * If not, the point will be created as infeasible
   */
  private checkIntersectionExists(): boolean {
    // TODO: Use geometry service to calculate actual intersection
    // For now, we'll assume intersection exists (will be computed during recomputation)
    // In a real implementation, we would:
    // 1. Get element1 and element2 geometries
    // 2. Calculate intersection points
    // 3. Return true if intersectionIndex < number of intersection points
    return true;
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
      // Check if intersection exists (determines infeasibility)
      const intersectionExists = this.checkIntersectionExists();

      // Create the Point2DFromIntersection element
      const point: Point2DFromIntersection = {
        id: this.pointId,
        kind: 'Point2DFromIntersection',
        name: this.params.name || this.pointId,
        planeId: this.params.planeId,
        createdBy: this.params.actionId,
        infeasible: !intersectionExists,
        element1Id: this.params.element1Id,
        element2Id: this.params.element2Id,
        intersectionIndex: this.params.intersectionIndex,
        visualStyle: {
          color: intersectionExists ? '#9c27b0' : '#f44336',  // Purple if feasible, red if infeasible
          lineWidth: 2,
          lineStyle: intersectionExists ? 'solid' : 'dashed',
          opacity: intersectionExists ? 1.0 : 0.6,
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

      // Add dependency edges (point depends on both elements)
      const depOp = new AddDependencyEdgesOp(
        generateOperationId(),
        [
          { from: this.params.element1Id, to: this.pointId },
          { from: this.params.element2Id, to: this.pointId }
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
          elementPath: elementPath,
          infeasible: !intersectionExists
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to create intersection point'
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
