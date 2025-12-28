/**
 * Create3DLineCommand - Create a 3D line from two compatible 2D line projections
 * 
 * This command creates a Line3DFromProjections element by selecting a line on the
 * horizontal plane and a compatible line on the vertical plane. The command validates
 * that the projections are transportable (compatible) according to FR-022.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Line3DFromProjections, Line2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generateElementId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export interface Create3DLineParams {
  projectionHId: string;  // Line2D on horizontal plane
  projectionVId: string;  // Line2D on vertical plane
  actionId: string;       // The action that is creating this 3D line
  name?: string;          // Optional custom name (auto-generated if not provided)
}

export class Create3DLineCommand extends Command {
  private params: Create3DLineParams;
  private worldStore: any;
  private line3DId: string;

  constructor(params: Create3DLineParams, worldStore: any) {
    super(generateCommandId(), `Create 3D line from projections`);
    this.params = params;
    this.worldStore = worldStore;
    this.line3DId = generateElementId();
  }

  /**
   * Validate command parameters
   * Implements FR-022: Compatibility validation for projection pairing
   */
  validate(): { valid: boolean; error?: string } {
    // Check if projection lines exist
    const projectionH = this.worldStore.elements2D.get(this.params.projectionHId);
    const projectionV = this.worldStore.elements2D.get(this.params.projectionVId);

    if (!projectionH) {
      return { valid: false, error: `Horizontal projection ${this.params.projectionHId} does not exist` };
    }

    if (!projectionV) {
      return { valid: false, error: `Vertical projection ${this.params.projectionVId} does not exist` };
    }

    // Check if elements are lines
    if (!projectionH.kind.startsWith('Line2D')) {
      return { valid: false, error: `Horizontal projection must be a 2D line` };
    }

    if (!projectionV.kind.startsWith('Line2D')) {
      return { valid: false, error: `Vertical projection must be a 2D line` };
    }

    // Check if projections are on correct planes
    const viewStore = (window as any).useViewStore?.();
    if (viewStore) {
      const horizontalPlane = viewStore.planes.find((p: any) => p.id === 'P_H');
      const verticalPlane = viewStore.planes.find((p: any) => p.id === 'P_V');

      if (!horizontalPlane || projectionH.planeId !== horizontalPlane.id) {
        return { valid: false, error: `Horizontal projection must be on plane P_H` };
      }

      if (!verticalPlane || projectionV.planeId !== verticalPlane.id) {
        return { valid: false, error: `Vertical projection must be on plane P_V` };
      }
    }

    // Check compatibility (FR-022): Projections must be transportable
    if (projectionH.infeasible) {
      return { valid: false, error: `Horizontal projection is infeasible` };
    }

    if (projectionV.infeasible) {
      return { valid: false, error: `Vertical projection is infeasible` };
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
      // Create the Line3DFromProjections element
      const line3D: Line3DFromProjections = {
        id: this.line3DId,
        kind: 'Line3DFromProjections',
        name: this.params.name || this.line3DId,
        createdBy: this.params.actionId,
        infeasible: false,
        projectionHId: this.params.projectionHId,
        projectionVId: this.params.projectionVId,
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
      const elementPath = `/world/elements3D/${this.line3DId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        line3D,
        this.worldStore
      );

      const addResult = this.addAndExecute(addOp);
      if (!addResult.success) {
        return addResult;
      }

      // Add dependency edges
      // 3D line depends on both 2D projections
      const dependencyEdges = [
        {
          from: `/world/elements2D/${this.params.projectionHId}`,
          to: elementPath,
          type: 'defines' as const
        },
        {
          from: `/world/elements2D/${this.params.projectionVId}`,
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
          line3DId: this.line3DId
        }
      };
    } catch (error: any) {
      return {
        success: false,
        outputs: {},
        error: error.message || 'Unknown error during 3D line creation'
      };
    }
  }

  /**
   * Get the ID of the created 3D line (useful after execution)
   */
  getLine3DId(): string {
    return this.line3DId;
  }
}
