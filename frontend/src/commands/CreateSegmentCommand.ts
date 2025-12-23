/**
 * CreateSegmentCommand - Create a segment between two points
 * 
 * This command creates a Segment2DByPoints element connecting two existing points.
 * If the points are coincident (same location), the segment is marked as infeasible.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Segment2DByPoints, Point2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generateSegmentId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export interface CreateSegmentParams {
  point1Id: string;
  point2Id: string;
  planeId: string;
  actionId: string;      // The action that is creating this segment
  name?: string;         // Optional custom name (auto-generated if not provided)
}

export class CreateSegmentCommand extends Command {
  private params: CreateSegmentParams;
  private worldStore: any;
  private segmentId: string;

  constructor(params: CreateSegmentParams, worldStore: any) {
    super(generateCommandId(), `Create segment ${params.point1Id}-${params.point2Id}`);
    this.params = params;
    this.worldStore = worldStore;
    this.segmentId = generateSegmentId();
  }

  /**
   * Get coordinates of a point
   */
  private getPointCoordinates(point: Point2D): { x: number; y: number } | null {
    if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
      return { x: point.x, y: point.y };
    }
    // For other point types, coordinates need to be computed
    // This is a placeholder - will be computed during recomputation
    return { x: 0, y: 0 };
  }

  /**
   * Check if two points are coincident (at the same location)
   */
  private arePointsCoincident(): boolean {
    const point1 = this.worldStore.elements2D.get(this.params.point1Id) as Point2D;
    const point2 = this.worldStore.elements2D.get(this.params.point2Id) as Point2D;

    if (!point1 || !point2) return false;

    const coords1 = this.getPointCoordinates(point1);
    const coords2 = this.getPointCoordinates(point2);

    if (!coords1 || !coords2) return false;

    // Check if coordinates are within epsilon distance
    const epsilon = 0.0001;
    const dx = coords1.x - coords2.x;
    const dy = coords1.y - coords2.y;
    const distanceSquared = dx * dx + dy * dy;

    return distanceSquared < epsilon * epsilon;
  }

  /**
   * Validate command parameters
   */
  validate(): { valid: boolean; error?: string } {
    // Check if both points exist
    const point1 = this.worldStore.elements2D.get(this.params.point1Id);
    if (!point1) {
      return { valid: false, error: `Point ${this.params.point1Id} does not exist` };
    }

    const point2 = this.worldStore.elements2D.get(this.params.point2Id);
    if (!point2) {
      return { valid: false, error: `Point ${this.params.point2Id} does not exist` };
    }

    // Check if points are on the same plane
    if (point1.planeId !== this.params.planeId || point2.planeId !== this.params.planeId) {
      return { valid: false, error: 'Both points must be on the same plane as the segment' };
    }

    // Check if points are different
    if (this.params.point1Id === this.params.point2Id) {
      return { valid: false, error: 'Cannot create segment with same point for both endpoints' };
    }

    // Note: Coincident points are allowed but will make the segment infeasible
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
      // Check if segment is infeasible (coincident points)
      const infeasible = this.arePointsCoincident();

      // Create the Segment2DByPoints element
      const segment: Segment2DByPoints = {
        id: this.segmentId,
        kind: 'Segment2DByPoints',
        name: this.params.name || this.segmentId,
        planeId: this.params.planeId,
        createdBy: this.params.actionId,
        infeasible: infeasible,
        point1Id: this.params.point1Id,
        point2Id: this.params.point2Id,
        visualStyle: {
          color: infeasible ? '#f44336' : '#4caf50',  // Red if infeasible, green if feasible
          lineWidth: 2,
          lineStyle: infeasible ? 'dashed' : 'solid',
          opacity: infeasible ? 0.6 : 1.0,
          visible: true,
          inherited: false
        }
      };

      // Add element to world
      const elementPath = `/world/elements2D/${this.segmentId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        segment,
        this.worldStore
      );

      const addResult = this.addAndExecute(addOp);
      if (!addResult.success) {
        return addResult;
      }

      // Add dependency edges (segment depends on both points)
      const depOp = new AddDependencyEdgesOp(
        generateOperationId(),
        [
          { from: this.params.point1Id, to: this.segmentId },
          { from: this.params.point2Id, to: this.segmentId }
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
          segmentId: this.segmentId,
          elementPath: elementPath,
          infeasible: infeasible
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to create segment'
      };
    }
  }

  /**
   * Get the ID of the created segment (useful after execution)
   */
  getSegmentId(): string {
    return this.segmentId;
  }
}
