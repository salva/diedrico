/**
 * CreateLineCommand - Create a line with various construction methods
 * 
 * Supports three construction variants:
 * 1. By two points (Line2DByTwoPoints)
 * 2. Parallel to reference line through a point (Line2DParallelThroughPoint)
 * 3. Perpendicular to reference line through a point (Line2DPerpendicularThroughPoint)
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Line2D, Line2DByTwoPoints, Line2DParallelThroughPoint, Line2DPerpendicularThroughPoint, Point2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generateLineId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';

export type LineConstructionMethod = 
  | { type: 'by-two-points'; point1Id: string; point2Id: string }
  | { type: 'parallel'; referenceLineId: string; throughPointId: string }
  | { type: 'perpendicular'; referenceLineId: string; throughPointId: string };

export interface CreateLineParams {
  method: LineConstructionMethod;
  planeId: string;
  actionId: string;      // The action that is creating this line
  name?: string;         // Optional custom name (auto-generated if not provided)
}

export class CreateLineCommand extends Command {
  private params: CreateLineParams;
  private worldStore: any;
  private lineId: string;

  constructor(params: CreateLineParams, worldStore: any) {
    super(generateCommandId(), CreateLineCommand.getDescription(params.method));
    this.params = params;
    this.worldStore = worldStore;
    this.lineId = generateLineId();
  }

  /**
   * Generate command description based on construction method
   */
  private static getDescription(method: LineConstructionMethod): string {
    switch (method.type) {
      case 'by-two-points':
        return `Create line through ${method.point1Id} and ${method.point2Id}`;
      case 'parallel':
        return `Create line parallel to ${method.referenceLineId} through ${method.throughPointId}`;
      case 'perpendicular':
        return `Create line perpendicular to ${method.referenceLineId} through ${method.throughPointId}`;
    }
  }

  /**
   * Get coordinates of a point
   */
  private getPointCoordinates(point: Point2D): { x: number; y: number } | null {
    if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
      return { x: point.x, y: point.y };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Check if two points are coincident (for by-two-points variant)
   */
  private arePointsCoincident(point1Id: string, point2Id: string): boolean {
    const point1 = this.worldStore.elements2D.get(point1Id) as Point2D;
    const point2 = this.worldStore.elements2D.get(point2Id) as Point2D;

    if (!point1 || !point2) return false;

    const coords1 = this.getPointCoordinates(point1);
    const coords2 = this.getPointCoordinates(point2);

    if (!coords1 || !coords2) return false;

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
    const method = this.params.method;

    if (method.type === 'by-two-points') {
      // Validate both points exist
      const point1 = this.worldStore.elements2D.get(method.point1Id);
      if (!point1) {
        return { valid: false, error: `Point ${method.point1Id} does not exist` };
      }

      const point2 = this.worldStore.elements2D.get(method.point2Id);
      if (!point2) {
        return { valid: false, error: `Point ${method.point2Id} does not exist` };
      }

      // Check if points are on the same plane
      if (point1.planeId !== this.params.planeId || point2.planeId !== this.params.planeId) {
        return { valid: false, error: 'Both points must be on the same plane as the line' };
      }

      // Check if points are different
      if (method.point1Id === method.point2Id) {
        return { valid: false, error: 'Cannot create line with same point twice' };
      }

    } else if (method.type === 'parallel' || method.type === 'perpendicular') {
      // Validate reference line exists
      const referenceLine = this.worldStore.elements2D.get(method.referenceLineId);
      if (!referenceLine) {
        return { valid: false, error: `Reference line ${method.referenceLineId} does not exist` };
      }

      // Check if reference is actually a line
      if (!referenceLine.kind.startsWith('Line2D')) {
        return { valid: false, error: 'Reference element must be a line' };
      }

      // Validate through point exists
      const throughPoint = this.worldStore.elements2D.get(method.throughPointId);
      if (!throughPoint) {
        return { valid: false, error: `Point ${method.throughPointId} does not exist` };
      }

      // Check if line and point are on the same plane
      if (referenceLine.planeId !== this.params.planeId || throughPoint.planeId !== this.params.planeId) {
        return { valid: false, error: 'Reference line and point must be on the same plane' };
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
      const method = this.params.method;
      let line: Line2D;
      let dependencyEdges: Array<{ from: string; to: string }> = [];
      let infeasible = false;

      // Create appropriate line type based on construction method
      if (method.type === 'by-two-points') {
        // Check if line is infeasible (coincident points)
        infeasible = this.arePointsCoincident(method.point1Id, method.point2Id);

        line = {
          id: this.lineId,
          kind: 'Line2DByTwoPoints',
          name: this.params.name || this.lineId,
          planeId: this.params.planeId,
          createdBy: this.params.actionId,
          infeasible: infeasible,
          point1Id: method.point1Id,
          point2Id: method.point2Id,
          visualStyle: {
            color: infeasible ? '#f44336' : '#2196f3',
            lineWidth: 1,
            lineStyle: infeasible ? 'dashed' : 'solid',
            opacity: infeasible ? 0.6 : 1.0,
            visible: true,
            inherited: false
          }
        } as Line2DByTwoPoints;

        dependencyEdges = [
          { from: method.point1Id, to: this.lineId },
          { from: method.point2Id, to: this.lineId }
        ];

      } else if (method.type === 'parallel') {
        line = {
          id: this.lineId,
          kind: 'Line2DParallelThroughPoint',
          name: this.params.name || this.lineId,
          planeId: this.params.planeId,
          createdBy: this.params.actionId,
          infeasible: false,
          referenceLineId: method.referenceLineId,
          throughPointId: method.throughPointId,
          visualStyle: {
            color: '#ff9800',
            lineWidth: 1,
            lineStyle: 'solid',
            opacity: 1.0,
            visible: true,
            inherited: false
          }
        } as Line2DParallelThroughPoint;

        dependencyEdges = [
          { from: method.referenceLineId, to: this.lineId },
          { from: method.throughPointId, to: this.lineId }
        ];

      } else { // perpendicular
        line = {
          id: this.lineId,
          kind: 'Line2DPerpendicularThroughPoint',
          name: this.params.name || this.lineId,
          planeId: this.params.planeId,
          createdBy: this.params.actionId,
          infeasible: false,
          referenceLineId: method.referenceLineId,
          throughPointId: method.throughPointId,
          visualStyle: {
            color: '#9c27b0',
            lineWidth: 1,
            lineStyle: 'solid',
            opacity: 1.0,
            visible: true,
            inherited: false
          }
        } as Line2DPerpendicularThroughPoint;

        dependencyEdges = [
          { from: method.referenceLineId, to: this.lineId },
          { from: method.throughPointId, to: this.lineId }
        ];
      }

      // Add element to world
      const elementPath = `/world/elements2D/${this.lineId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        line,
        this.worldStore
      );

      const addResult = this.addAndExecute(addOp);
      if (!addResult.success) {
        return addResult;
      }

      // Add dependency edges
      const depOp = new AddDependencyEdgesOp(
        generateOperationId(),
        dependencyEdges,
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
          lineId: this.lineId,
          elementPath: elementPath,
          infeasible: infeasible
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to create line'
      };
    }
  }

  /**
   * Get the ID of the created line (useful after execution)
   */
  getLineId(): string {
    return this.lineId;
  }
}
