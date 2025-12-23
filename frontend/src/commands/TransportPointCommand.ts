/**
 * TransportPointCommand - Transport a point from one plane to another along a guide
 * 
 * The transported point is a derived point created on the target plane at the
 * intersection of the guide with that plane. The point maintains dependency on
 * the source point and the guide.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Point2DDerived, Point2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import type { Guide } from '../domain/world/Guide';
import { generatePointId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';
import { defaultVisualStyle } from '../domain/world/VisualStyle';

export interface TransportPointParams {
  guideId: string;          // Guide to transport along
  sourcePointId: string;    // Point to transport
  actionId: string;         // The action that is creating this transported point
  name?: string;            // Optional custom name (auto-generated if not provided)
}

export class TransportPointCommand extends Command {
  private params: TransportPointParams;
  private worldStore: any;
  private transportedPointId: string;

  constructor(params: TransportPointParams, worldStore: any) {
    super(
      generateCommandId(),
      `Transport point ${params.sourcePointId} via guide ${params.guideId}`
    );
    this.params = params;
    this.worldStore = worldStore;
    this.transportedPointId = generatePointId();
  }

  /**
   * Get coordinates of a point
   */
  private getPointCoordinates(point: Point2D): { x: number; y: number } | null {
    if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
      return { x: point.x, y: point.y };
    }
    // For other point types, would need to compute actual coordinates
    return { x: 0, y: 0 };
  }

  /**
   * Determine target plane (the plane opposite to source point's plane)
   */
  private getTargetPlane(guide: Guide, sourcePoint: Point2D): string | null {
    if (sourcePoint.planeId === guide.plane1Id) {
      return guide.plane2Id;
    } else if (sourcePoint.planeId === guide.plane2Id) {
      return guide.plane1Id;
    }
    return null;
  }

  /**
   * Compute transported point coordinates
   * For MVP with HL_HV (horizontal hinge), guide is vertical, so:
   * - Guide passes through x-coordinate of the defining point
   * - Transported point has same x-coordinate, y from source
   */
  private computeTransportedCoordinates(
    sourceCoords: { x: number; y: number },
    _guide: Guide,
    _targetPlaneId: string
  ): { x: number; y: number } {
    // For MVP: guide is vertical (perpendicular to horizontal HL_HV)
    // Transported point keeps x-coordinate (guide's x) and source point's y
    return {
      x: sourceCoords.x,  // Same x as guide
      y: sourceCoords.y   // Same y as source point
    };
  }

  execute(): OperationResult {
    try {
      // 1. Get guide
      const guide = this.worldStore.getGuide(this.params.guideId);
      if (!guide) {
        return {
          success: false,
          outputs: {},
          error: `Guide not found: ${this.params.guideId}`
        };
      }

      // 2. Get source point
      const sourcePoint = this.worldStore.elements2D.get(this.params.sourcePointId) as Point2D;
      if (!sourcePoint) {
        return {
          success: false,
          outputs: {},
          error: `Source point not found: ${this.params.sourcePointId}`
        };
      }

      // 3. Get source point coordinates
      const sourceCoords = this.getPointCoordinates(sourcePoint);
      if (!sourceCoords) {
        return {
          success: false,
          outputs: {},
          error: `Cannot determine coordinates for source point: ${this.params.sourcePointId}`
        };
      }

      // 4. Determine target plane
      const targetPlaneId = this.getTargetPlane(guide, sourcePoint);
      if (!targetPlaneId) {
        return {
          success: false,
          outputs: {},
          error: `Source point ${this.params.sourcePointId} is not on a plane associated with guide ${this.params.guideId}`
        };
      }

      // 5. Compute transported point coordinates
      const transportedCoords = this.computeTransportedCoordinates(
        sourceCoords,
        guide,
        targetPlaneId
      );

      // 6. Generate name
      const pointName = this.params.name || this.generatePointName(targetPlaneId);

      // 7. Create derived point
      const transportedPoint: Point2DDerived = {
        id: this.transportedPointId,
        kind: 'Point2DDerived',
        name: pointName,
        planeId: targetPlaneId,
        x: transportedCoords.x,
        y: transportedCoords.y,
        sourceActionId: this.params.actionId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: {
          ...defaultVisualStyle,
          color: '#9e9e9e',  // Gray color for derived points
          opacity: 0.7       // Reduced opacity
        }
      };

      // 8. Add element to world
      const elementPath = `/world/elements2D/${this.transportedPointId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        transportedPoint,
        this.worldStore
      );

      const addResult = this.addAndExecute(addOp);
      if (!addResult.success) {
        return addResult;
      }

      // 9. Add dependency edges (source point → transported point, guide → transported point)
      const depEdges = [
        { from: this.params.sourcePointId, to: this.transportedPointId },
        { from: guide.guide2DInPlane1Id, to: this.transportedPointId },
        { from: guide.guide2DInPlane2Id, to: this.transportedPointId }
      ];

      const depOp = new AddDependencyEdgesOp(
        generateOperationId(),
        depEdges,
        this.worldStore
      );

      const depResult = this.addAndExecute(depOp);
      if (!depResult.success) {
        return depResult;
      }

      return {
        success: true,
        outputs: {
          transportedPointId: this.transportedPointId
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: `Failed to transport point: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate auto-incremented point name based on plane
   */
  private generatePointName(planeId: string): string {
    const points = Array.from(this.worldStore.elements2D.values()).filter(
      (el: any) => el.kind?.startsWith('Point2D') && el.planeId === planeId
    );
    
    // Use lowercase letters for derived points
    const nextNumber = points.length + 1;
    return `p${nextNumber}`;
  }

  getOutputElementIds(): string[] {
    return [this.transportedPointId];
  }
}
