/**
 * CreateGuideCommand - Create a guide perpendicular to a hinge line
 * 
 * A guide is a line perpendicular to a hinge line (HL) that spans both
 * projection planes associated with that HL. Guides are used for transporting
 * points and distances between planes.
 * 
 * MVP: Only supports guides from HingeLine (HL_HV), not BHL projections yet.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Guide2DPerpendicularToLine, Point2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import type { HingeLine } from '../domain/viewState/HingeLine';
import { generateGuideId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';
import { createGuide } from '../domain/world/Guide';
import { perpendicularThroughPoint } from '../domain/calculations/perpendiculars';
import { defaultVisualStyle } from '../domain/world/VisualStyle';

export interface CreateGuideParams {
  hingeLineId: string;      // HingeLine ID (e.g., "HL_HV")
  throughPointId: string;   // Point on one of the planes
  actionId: string;         // The action that is creating this guide
  name?: string;            // Optional custom name (auto-generated if not provided)
}

export class CreateGuideCommand extends Command {
  private params: CreateGuideParams;
  private worldStore: any;
  private viewStore: any;
  private guideId: string;
  private guide2DPlane1Id: string;
  private guide2DPlane2Id: string;

  constructor(params: CreateGuideParams, worldStore: any, viewStore: any) {
    super(
      generateCommandId(),
      `Create guide perpendicular to ${params.hingeLineId} through ${params.throughPointId}`
    );
    this.params = params;
    this.worldStore = worldStore;
    this.viewStore = viewStore;
    this.guideId = generateGuideId();
    this.guide2DPlane1Id = generateGuideId(); // ID for guide element on plane 1
    this.guide2DPlane2Id = generateGuideId(); // ID for guide element on plane 2
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
   * Get line representation of hinge line on a plane
   * For HL_HV, the hinge line is horizontal (y=0)
   */
  private getHingeLineOnPlane(_hingeLine: HingeLine, _planeId: string): { x1: number; y1: number; x2: number; y2: number } {
    // For MVP, HL_HV is always horizontal at y=0
    // In future, would compute based on plane geometry
    // For now, return a horizontal line
    return { x1: -1000, y1: 0, x2: 1000, y2: 0 };
  }

  execute(): OperationResult {
    try {
      // 1. Get hinge line
      const hingeLine = this.viewStore.getHingeLineById(this.params.hingeLineId);
      if (!hingeLine) {
        return {
          success: false,
          outputs: {},
          error: `Hinge line not found: ${this.params.hingeLineId}`
        };
      }

      // 2. Get point
      const point = this.worldStore.elements2D.get(this.params.throughPointId) as Point2D;
      if (!point) {
        return {
          success: false,
          outputs: {},
          error: `Point not found: ${this.params.throughPointId}`
        };
      }

      const pointCoords = this.getPointCoordinates(point);
      if (!pointCoords) {
        return {
          success: false,
          outputs: {},
          error: `Cannot determine coordinates for point: ${this.params.throughPointId}`
        };
      }

      // 3. Compute perpendicular line on plane 1
      const hlLine1 = this.getHingeLineOnPlane(hingeLine, hingeLine.plane1Id);
      const perpResult1 = perpendicularThroughPoint(hlLine1, pointCoords);
      if (!perpResult1.ok) {
        return {
          success: false,
          outputs: {},
          error: `Failed to compute perpendicular on plane1: ${perpResult1.error}`
        };
      }

      // 4. Compute perpendicular line on plane 2
      const hlLine2 = this.getHingeLineOnPlane(hingeLine, hingeLine.plane2Id);
      const perpResult2 = perpendicularThroughPoint(hlLine2, pointCoords);
      if (!perpResult2.ok) {
        return {
          success: false,
          outputs: {},
          error: `Failed to compute perpendicular on plane2: ${perpResult2.error}`
        };
      }

      // 5. Generate name
      const guideName = this.params.name || this.generateGuideName();

      // 6. Create Guide2D elements for both planes
      const guide2DPlane1: Guide2DPerpendicularToLine = {
        id: this.guide2DPlane1Id,
        kind: 'Guide2DPerpendicularToLine',
        name: `${guideName}_P1`,
        planeId: hingeLine.plane1Id,
        referenceLineId: this.params.hingeLineId,
        throughPointId: this.params.throughPointId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#00aa00', lineWidth: 1, lineStyle: 'dashed' }
      };

      const guide2DPlane2: Guide2DPerpendicularToLine = {
        id: this.guide2DPlane2Id,
        kind: 'Guide2DPerpendicularToLine',
        name: `${guideName}_P2`,
        planeId: hingeLine.plane2Id,
        referenceLineId: this.params.hingeLineId,
        throughPointId: this.params.throughPointId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#00aa00', lineWidth: 1, lineStyle: 'dashed' }
      };

      // 7. Create Guide entity
      const guide = createGuide(
        this.guideId,
        guideName,
        this.params.hingeLineId,
        this.params.throughPointId,
        this.guide2DPlane1Id,
        this.guide2DPlane2Id,
        hingeLine.plane1Id,
        hingeLine.plane2Id
      );

      // 8. Add Guide2D elements
      const elementPath1 = `/world/elements2D/${this.guide2DPlane1Id}`;
      const addOp1 = new AddElementOp(
        generateOperationId(),
        elementPath1,
        guide2DPlane1,
        this.worldStore
      );

      const addResult1 = this.addAndExecute(addOp1);
      if (!addResult1.success) {
        return addResult1;
      }

      const elementPath2 = `/world/elements2D/${this.guide2DPlane2Id}`;
      const addOp2 = new AddElementOp(
        generateOperationId(),
        elementPath2,
        guide2DPlane2,
        this.worldStore
      );

      const addResult2 = this.addAndExecute(addOp2);
      if (!addResult2.success) {
        return addResult2;
      }

      // 9. Add dependency edges (point → guide elements)
      const depEdges = [
        { from: this.params.throughPointId, to: this.guide2DPlane1Id },
        { from: this.params.throughPointId, to: this.guide2DPlane2Id }
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

      // 10. Store guide entity
      this.worldStore.addGuide(guide);

      return {
        success: true,
        outputs: {
          guideId: this.guideId,
          guide2DPlane1Id: this.guide2DPlane1Id,
          guide2DPlane2Id: this.guide2DPlane2Id
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: `Failed to create guide: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate auto-incremented guide name
   */
  private generateGuideName(): string {
    const existingGuides = this.worldStore.allGuides;
    const guideNumbers = existingGuides
      .map((g: any) => {
        const match = g.name.match(/^g(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n: number) => n > 0);

    const nextNumber = guideNumbers.length > 0 ? Math.max(...guideNumbers) + 1 : 1;
    return `g${nextNumber}`;
  }

  getOutputElementIds(): string[] {
    return [this.guide2DPlane1Id, this.guide2DPlane2Id];
  }
}
