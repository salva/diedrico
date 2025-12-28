/**
 * Create3DSegmentCommand - Create a 3D segment from two 3D points
 * 
 * This command creates a Segment3DByPoints element by selecting two 3D points.
 * Unlike 3D points and lines which are created from 2D projections, 3D segments
 * are created from existing 3D points.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Segment3DByPoints } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generateElementId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export interface Create3DSegmentParams {
  point1Id: string;       // First Point3D
  point2Id: string;       // Second Point3D
  actionId: string;       // The action that is creating this 3D segment
  name?: string;          // Optional custom name (auto-generated if not provided)
}

export class Create3DSegmentCommand extends Command {
  private params: Create3DSegmentParams;
  private worldStore: any;
  private segment3DId: string;

  constructor(params: Create3DSegmentParams, worldStore: any) {
    super(generateCommandId(), `Create 3D segment from two 3D points`);
    this.params = params;
    this.worldStore = worldStore;
    this.segment3DId = generateElementId();
  }

  /**
   * Validate command parameters
   */
  validate(): { valid: boolean; error?: string } {
    // Check if points exist
    const point1 = this.worldStore.elements3D.get(this.params.point1Id);
    const point2 = this.worldStore.elements3D.get(this.params.point2Id);

    if (!point1) {
      return { valid: false, error: `Point ${this.params.point1Id} does not exist` };
    }

    if (!point2) {
      return { valid: false, error: `Point ${this.params.point2Id} does not exist` };
    }

    // Check if elements are 3D points
    if (!point1.kind.startsWith('Point3D')) {
      return { valid: false, error: `First endpoint must be a 3D point` };
    }

    if (!point2.kind.startsWith('Point3D')) {
      return { valid: false, error: `Second endpoint must be a 3D point` };
    }

    // Check if points are different
    if (this.params.point1Id === this.params.point2Id) {
      return { valid: false, error: `Cannot create segment with same point twice` };
    }

    // Check if points are feasible
    if (point1.infeasible) {
      return { valid: false, error: `First point is infeasible` };
    }

    if (point2.infeasible) {
      return { valid: false, error: `Second point is infeasible` };
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
      // Create the Segment3DByPoints element
      const segment3D: Segment3DByPoints = {
        id: this.segment3DId,
        kind: 'Segment3DByPoints',
        name: this.params.name || this.segment3DId,
        createdBy: this.params.actionId,
        infeasible: false,
        point1Id: this.params.point1Id,
        point2Id: this.params.point2Id,
        visualStyle: {
          color: '#9c27b0',  // Purple for 3D elements
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      // Add element to world
      const elementPath = `/world/elements3D/${this.segment3DId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        segment3D,
        this.worldStore
      );

      const addResult = this.addAndExecute(addOp);
      if (!addResult.success) {
        return addResult;
      }

      // Add dependency edges
      // 3D segment depends on both 3D points
      const dependencyEdges = [
        {
          from: `/world/elements3D/${this.params.point1Id}`,
          to: elementPath,
          type: 'defines' as const
        },
        {
          from: `/world/elements3D/${this.params.point2Id}`,
          to: elementPath,
          type: 'defines' as const
        }
      ];

      const dependencyOp = new AddDependencyEdgesOp(
        generateOperationId(),
        dependencyEdges,
        this.worldStore
      );

      const depResult = this.addAndExecute(dependencyOp);
      if (!depResult.success) {
        return depResult;
      }

      return {
        success: true,
        outputs: {
          segment3DId: this.segment3DId
        }
      };
    } catch (error: any) {
      return {
        success: false,
        outputs: {},
        error: error.message || 'Unknown error during 3D segment creation'
      };
    }
  }

  /**
   * Get the ID of the created 3D segment (useful after execution)
   */
  getSegment3DId(): string {
    return this.segment3DId;
  }
}
