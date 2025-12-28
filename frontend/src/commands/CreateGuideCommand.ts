/**
 * CreateGuideCommand - Create a guide perpendicular to a hinge line or BHL projection
 * 
 * A guide is a line perpendicular to a reference line (HL or BHL projection) that spans both
 * projection planes associated with that line. Guides are used for transporting
 * points and distances between planes.
 * 
 * Supports:
 * - HingeLine (HL_HV) - structural fold between projection planes
 * - BHL projections - with automatic transport to paired projection
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Guide2DPerpendicularToLine, Point2D, Line2D, BHLProjection2D, Line2DByTwoPoints, Line3D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import type { BrokenHingeLine } from '../domain/world/BrokenHingeLine';
import { generateGuideId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';
import { createGuide } from '../domain/world/Guide';
import { perpendicularThroughPoint } from '../domain/calculations/perpendiculars';
import { defaultVisualStyle } from '../domain/world/VisualStyle';

export interface CreateGuideParams {
  referenceLineId: string;  // HingeLine ID (e.g., "HL_HV") or BHL projection element ID
  throughPointId: string;   // Point on one of the planes
  actionId: string;         // The action that is creating this guide
  name?: string;            // Optional custom name (auto-generated if not provided)
  // Legacy support
  hingeLineId?: string;     // Deprecated: use referenceLineId instead
}

export class CreateGuideCommand extends Command {
  private params: CreateGuideParams;
  private worldStore: any;
  private viewStore: any;
  private guideId: string;
  private guide2DPlane1Id: string;
  private guide2DPlane2Id: string;

  constructor(params: CreateGuideParams, worldStore: any, viewStore: any) {
    // Support legacy hingeLineId parameter
    const refLineId = params.referenceLineId || params.hingeLineId || '';
    super(
      generateCommandId(),
      `Create guide perpendicular to ${refLineId} through ${params.throughPointId}`
    );
    this.params = { ...params, referenceLineId: refLineId };
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
   * Get line geometry from a Line2D element
   */
  private getLineGeometry(line: Line2DByTwoPoints): { x1: number; y1: number; x2: number; y2: number } {
    const p1 = this.worldStore.elements2D.get(line.point1Id) as Point2D;
    const p2 = this.worldStore.elements2D.get(line.point2Id) as Point2D;
    
    if (!p1 || !p2) {
      // Fallback if points not found
      return { x1: -1000, y1: 0, x2: 1000, y2: 0 };
    }
    
    const coords1 = this.getPointCoordinates(p1);
    const coords2 = this.getPointCoordinates(p2);
    
    if (!coords1 || !coords2) {
      return { x1: -1000, y1: 0, x2: 1000, y2: 0 };
    }
    
    return { x1: coords1.x, y1: coords1.y, x2: coords2.x, y2: coords2.y };
  }

  /**
   * Find the BrokenHingeLine entity for a given BHL projection
   */
  private findBHLForProjection(projection: BHLProjection2D): BrokenHingeLine | null {
    if (!this.worldStore.brokenHingeLines) {
      return null;
    }

    // Search through all BHLs to find one that references this projection
    for (const bhl of this.worldStore.brokenHingeLines.values()) {
      if (bhl.projectionOnPlane1Id === projection.id || bhl.projectionOnPlane2Id === projection.id) {
        return bhl;
      }
    }

    return null;
  }

  /**
   * Get line geometry for a BHL projection
   * For now, returns a placeholder line - full implementation would compute actual geometry
   */
  private getBHLLineGeometry(_projection: BHLProjection2D): { x1: number; y1: number; x2: number; y2: number } {
    // TODO: Compute actual BHL line geometry from 3D plane intersection
    // For now, return a diagonal line as placeholder
    return { x1: -500, y1: -500, x2: 500, y2: 500 };
  }

  execute(): OperationResult {
    try {
      // 1. Determine if reference is a 3D Line (HL_HV or other) or BHL projection
      const refElement3D = this.worldStore.elements3D.get(this.params.referenceLineId);
      const is3DLine = refElement3D?.kind === 'Line3DFromProjections' 
                       || refElement3D?.kind === 'Line3DFromPlaneIntersection';
      const isBHLProjection = !is3DLine && this.worldStore.elements2D.has(this.params.referenceLineId);
      
      if (!is3DLine && !isBHLProjection) {
        return {
          success: false,
          outputs: {},
          error: `Reference line not found: ${this.params.referenceLineId}`
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

      // 3. Get plane information and reference lines based on type
      let plane1Id: string;
      let plane2Id: string;
      let refLine1: { x1: number; y1: number; x2: number; y2: number };
      let refLine2: { x1: number; y1: number; x2: number; y2: number };

      if (is3DLine) {
        // 3D Line case (HL_HV)
        const line3D = refElement3D as Line3D;
        const projH = this.worldStore.elements2D.get(line3D.projectionHId) as Line2DByTwoPoints;
        const projV = this.worldStore.elements2D.get(line3D.projectionVId) as Line2DByTwoPoints;
        
        if (!projH || !projV) {
          return {
            success: false,
            outputs: {},
            error: `Could not find 2D projections for 3D line: ${this.params.referenceLineId}`
          };
        }
        
        plane1Id = projH.planeId;
        plane2Id = projV.planeId;
        refLine1 = this.getLineGeometry(projH);
        refLine2 = this.getLineGeometry(projV);
      } else {
        // BHL projection case
        const bhlProjection = this.worldStore.elements2D.get(this.params.referenceLineId) as BHLProjection2D;
        
        // Find the paired BHL projection
        const bhl = this.findBHLForProjection(bhlProjection);
        if (!bhl) {
          return {
            success: false,
            outputs: {},
            error: `Could not find BHL metadata for projection: ${this.params.referenceLineId}`
          };
        }

        plane1Id = bhl.plane1Id;
        plane2Id = bhl.plane2Id;
        
        // Get line geometry for the BHL projections
        const bhlProj1 = this.worldStore.elements2D.get(bhl.projectionOnPlane1Id) as BHLProjection2D;
        const bhlProj2 = this.worldStore.elements2D.get(bhl.projectionOnPlane2Id) as BHLProjection2D;
        
        refLine1 = this.getBHLLineGeometry(bhlProj1);
        refLine2 = this.getBHLLineGeometry(bhlProj2);
      }

      // 4. Compute perpendicular lines
      const perpResult1 = perpendicularThroughPoint(refLine1, pointCoords);
      if (!perpResult1.ok) {
        return {
          success: false,
          outputs: {},
          error: `Failed to compute perpendicular on plane1: ${perpResult1.error}`
        };
      }

      const perpResult2 = perpendicularThroughPoint(refLine2, pointCoords);
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
        planeId: plane1Id,
        referenceLineId: this.params.referenceLineId,
        throughPointId: this.params.throughPointId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#00aa00', lineWidth: 1, lineStyle: 'dashed' }
      };

      const guide2DPlane2: Guide2DPerpendicularToLine = {
        id: this.guide2DPlane2Id,
        kind: 'Guide2DPerpendicularToLine',
        name: `${guideName}_P2`,
        planeId: plane2Id,
        referenceLineId: this.params.referenceLineId,
        throughPointId: this.params.throughPointId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#00aa00', lineWidth: 1, lineStyle: 'dashed' }
      };

      // 7. Create Guide entity
      const guide = createGuide(
        this.guideId,
        guideName,
        this.params.referenceLineId,
        this.params.throughPointId,
        this.guide2DPlane1Id,
        this.guide2DPlane2Id,
        plane1Id,
        plane2Id
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
