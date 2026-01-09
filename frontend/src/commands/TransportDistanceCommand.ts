/**
 * TransportDistanceCommand - Transport a distance (segment) from one plane to another along guides
 * 
 * The transported distance is a derived segment connecting two transported points.
 * For MVP, both endpoints are transported using the same guide.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Segment2DByPoints, Point2DDerived, Point2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import type { Guide } from '../domain/world/Guide';
import { generateSegmentId, generatePointId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';
import { defaultVisualStyle } from '../domain/world/VisualStyle';

export interface TransportDistanceParams {
  guideId: string;          // Guide to transport along
  point1Id: string;         // First endpoint of distance
  point2Id: string;         // Second endpoint of distance
  actionId: string;         // The action that is creating this transported distance
  segmentName?: string;     // Optional custom name for segment
}

export class TransportDistanceCommand extends Command {
  private params: TransportDistanceParams;
  private worldStore: any;
  private transportedPoint1Id: string;
  private transportedPoint2Id: string;
  private transportedSegmentId: string;

  constructor(params: TransportDistanceParams, worldStore: any) {
    super(
      generateCommandId(),
      `Transport distance between ${params.point1Id} and ${params.point2Id} via guide ${params.guideId}`
    );
    this.params = params;
    this.worldStore = worldStore;
    this.transportedPoint1Id = generatePointId();
    this.transportedPoint2Id = generatePointId();
    this.transportedSegmentId = generateSegmentId();
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
   */
  private computeTransportedCoordinates(
    sourceCoords: { x: number; y: number }
  ): { x: number; y: number } {
    // For MVP: guide is vertical, transported point keeps x and y
    return {
      x: sourceCoords.x,
      y: sourceCoords.y
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

      // 2. Get source points
      const point1 = this.worldStore.elements2D.get(this.params.point1Id) as Point2D;
      const point2 = this.worldStore.elements2D.get(this.params.point2Id) as Point2D;
      
      if (!point1) {
        return {
          success: false,
          outputs: {},
          error: `Point 1 not found: ${this.params.point1Id}`
        };
      }
      
      if (!point2) {
        return {
          success: false,
          outputs: {},
          error: `Point 2 not found: ${this.params.point2Id}`
        };
      }

      // 3. Verify both points are on the same plane
      if (point1.planeId !== point2.planeId) {
        return {
          success: false,
          outputs: {},
          error: `Points must be on the same plane`
        };
      }

      // 4. Get coordinates
      const coords1 = this.getPointCoordinates(point1);
      const coords2 = this.getPointCoordinates(point2);
      
      if (!coords1 || !coords2) {
        return {
          success: false,
          outputs: {},
          error: `Cannot determine coordinates for points`
        };
      }

      // 5. Determine target plane
      const targetPlaneId = this.getTargetPlane(guide, point1);
      if (!targetPlaneId) {
        return {
          success: false,
          outputs: {},
          error: `Source points not on a plane associated with guide ${this.params.guideId}`
        };
      }

      // 6. Compute transported coordinates
      const transportedCoords1 = this.computeTransportedCoordinates(coords1);
      const transportedCoords2 = this.computeTransportedCoordinates(coords2);

      // 7. Create transported points
      const transportedPoint1: Point2DDerived = {
        id: this.transportedPoint1Id,
        kind: 'Point2DDerived',
        name: `${this.params.point1Id}'`,
        planeId: targetPlaneId,
        x: transportedCoords1.x,
        y: transportedCoords1.y,
        sourceActionId: this.params.actionId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: {
          ...defaultVisualStyle,
          color: '#9e9e9e',
          opacity: 0.7
        }
      };

      const transportedPoint2: Point2DDerived = {
        id: this.transportedPoint2Id,
        kind: 'Point2DDerived',
        name: `${this.params.point2Id}'`,
        planeId: targetPlaneId,
        x: transportedCoords2.x,
        y: transportedCoords2.y,
        sourceActionId: this.params.actionId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: {
          ...defaultVisualStyle,
          color: '#9e9e9e',
          opacity: 0.7
        }
      };

      // 8. Add transported points
      const addPoint1Result = this.addAndExecute(
        new AddElementOp(
          generateOperationId(),
          `/world/elements2D/${this.transportedPoint1Id}`,
          transportedPoint1,
          this.worldStore
        )
      );
      if (!addPoint1Result.success) return addPoint1Result;

      const addPoint2Result = this.addAndExecute(
        new AddElementOp(
          generateOperationId(),
          `/world/elements2D/${this.transportedPoint2Id}`,
          transportedPoint2,
          this.worldStore
        )
      );
      if (!addPoint2Result.success) return addPoint2Result;

      // 9. Create transported segment
      const transportedSegment: Segment2DByPoints = {
        id: this.transportedSegmentId,
        kind: 'Segment2DByPoints',
        name: this.params.segmentName || `s${this.transportedSegmentId}`,
        planeId: targetPlaneId,
        point1Id: this.transportedPoint1Id,
        point2Id: this.transportedPoint2Id,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: {
          ...defaultVisualStyle,
          color: '#9e9e9e',
          opacity: 0.7,
          lineStyle: 'dashed'
        }
      };

      const addSegmentResult = this.addAndExecute(
        new AddElementOp(
          generateOperationId(),
          `/world/elements2D/${this.transportedSegmentId}`,
          transportedSegment,
          this.worldStore
        )
      );
      if (!addSegmentResult.success) return addSegmentResult;

      // 10. Add dependency edges
      const depEdges = [
        // Source points → transported points
        { from: this.params.point1Id, to: this.transportedPoint1Id },
        { from: this.params.point2Id, to: this.transportedPoint2Id },
        // Guides → transported points
        { from: guide.guide2DInPlane1Id, to: this.transportedPoint1Id },
        { from: guide.guide2DInPlane2Id, to: this.transportedPoint1Id },
        { from: guide.guide2DInPlane1Id, to: this.transportedPoint2Id },
        { from: guide.guide2DInPlane2Id, to: this.transportedPoint2Id },
        // Transported points → transported segment
        { from: this.transportedPoint1Id, to: this.transportedSegmentId },
        { from: this.transportedPoint2Id, to: this.transportedSegmentId }
      ];

      const depResult = this.addAndExecute(
        new AddDependencyEdgesOp(
          generateOperationId(),
          depEdges,
          this.worldStore
        )
      );
      if (!depResult.success) return depResult;

      return {
        success: true,
        outputs: {
          transportedPoint1Id: this.transportedPoint1Id,
          transportedPoint2Id: this.transportedPoint2Id,
          transportedSegmentId: this.transportedSegmentId
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: `Failed to transport distance: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  getOutputElementIds(): string[] {
    return [this.transportedPoint1Id, this.transportedPoint2Id, this.transportedSegmentId];
  }
}
