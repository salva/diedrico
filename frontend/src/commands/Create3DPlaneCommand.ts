/**
 * Create3DPlaneCommand - Create a 3D plane from two trace lines
 * 
 * A 3D plane is defined by its horizontal trace (on P_H) and vertical trace (on P_V).
 * When created, this command automatically generates BHL (Broken Hinge Line) projections
 * on both projection planes.
 * 
 * The BHL projections represent where this 3D plane intersects the existing projection planes.
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { Plane3DByTraces, BHLProjection2D, Line2D } from '../types/ElementTypes';
import type { OperationResult } from '../types/CommandTypes';
import { generateElementId, generateCommandId, generateOperationId } from '../domain/world/IdGenerator';
import { createBrokenHingeLine } from '../domain/world/BrokenHingeLine';
import { 
  tracesToPlane3D, 
  computeBHLProjections,
  type Line2DGeometry 
} from '../domain/calculations/bhlProjections';
import { defaultVisualStyle } from '../domain/world/VisualStyle';

export interface Create3DPlaneParams {
  traceHId: string;          // Line2D on horizontal plane (P_H)
  traceVId: string;          // Line2D on vertical plane (P_V)
  actionId: string;          // The action that is creating this plane
  name?: string;             // Optional custom name (auto-generated if not provided)
}

export class Create3DPlaneCommand extends Command {
  private params: Create3DPlaneParams;
  private worldStore: any;
  private viewStore: any;
  private plane3DId: string;
  private bhlId: string;
  private bhlProjectionHId: string;
  private bhlProjectionVId: string;

  constructor(params: Create3DPlaneParams, worldStore: any, viewStore: any) {
    super(
      generateCommandId(),
      `Create 3D plane from traces ${params.traceHId} and ${params.traceVId}`
    );
    this.params = params;
    this.worldStore = worldStore;
    this.viewStore = viewStore;
    this.plane3DId = generateElementId();
    this.bhlId = generateElementId();
    this.bhlProjectionHId = generateElementId();
    this.bhlProjectionVId = generateElementId();
  }

  /**
   * Convert Line2D element to geometry for calculations
   */
  private lineToGeometry(line: Line2D): Line2DGeometry | null {
    if (line.kind === 'Line2DByTwoPoints') {
      const point1 = this.worldStore.elements2D.get(line.point1Id);
      const point2 = this.worldStore.elements2D.get(line.point2Id);
      
      if (!point1 || !point2) return null;
      
      // Get coordinates
      const p1Coords = this.getPointCoordinates(point1);
      const p2Coords = this.getPointCoordinates(point2);
      
      if (!p1Coords || !p2Coords) return null;
      
      return {
        point1: p1Coords,
        point2: p2Coords
      };
    }
    // Handle other line types if needed
    return null;
  }

  /**
   * Get coordinates of a point
   */
  private getPointCoordinates(point: any): { x: number; y: number } | null {
    if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
      return { x: point.x, y: point.y };
    }
    if (point.kind === 'Point2DFromIntersection' || point.kind === 'Point2DFromIntersection') {
      // For MVP, return placeholder - would need full geometry computation
      return { x: 0, y: 0 };
    }
    return null;
  }

  /**
   * Generate plane name if not provided
   */
  private generatePlaneName(): string {
    const planeCount = Array.from(this.worldStore.elements3D.values())
      .filter((el: any) => el.kind === 'Plane3DByTraces')
      .length;
    return `Pi${planeCount + 1}`;
  }

  /**
   * Generate BHL name
   */
  private generateBHLName(planeName: string): string {
    return `BHL_${planeName}`;
  }

  execute(): OperationResult {
    try {
      // 1. Get trace lines
      const traceH = this.worldStore.elements2D.get(this.params.traceHId) as Line2D;
      const traceV = this.worldStore.elements2D.get(this.params.traceVId) as Line2D;
      
      if (!traceH || !traceV) {
        return {
          success: false,
          outputs: {},
          error: 'Trace lines not found'
        };
      }

      // 2. Verify traces are on correct planes
      const planeH = this.viewStore.projectionPlanes.find((p: any) => p.name === 'P_H');
      const planeV = this.viewStore.projectionPlanes.find((p: any) => p.name === 'P_V');
      
      if (!planeH || !planeV) {
        return {
          success: false,
          outputs: {},
          error: 'Projection planes P_H and P_V not found'
        };
      }

      if (traceH.planeId !== planeH.id) {
        return {
          success: false,
          outputs: {},
          error: 'Horizontal trace must be on P_H plane'
        };
      }

      if (traceV.planeId !== planeV.id) {
        return {
          success: false,
          outputs: {},
          error: 'Vertical trace must be on P_V plane'
        };
      }

      // 3. Convert traces to geometry
      const traceHGeom = this.lineToGeometry(traceH);
      const traceVGeom = this.lineToGeometry(traceV);
      
      if (!traceHGeom || !traceVGeom) {
        return {
          success: false,
          outputs: {},
          error: 'Cannot determine trace geometry'
        };
      }

      // 4. Compute 3D plane equation
      const planeEquation = tracesToPlane3D(traceHGeom, traceVGeom);
      
      if (!planeEquation) {
        return {
          success: false,
          outputs: {},
          error: 'Traces do not define a valid 3D plane (parallel or degenerate)'
        };
      }

      // 5. Generate name
      const planeName = this.params.name || this.generatePlaneName();
      const bhlName = this.generateBHLName(planeName);

      // 6. Create Plane3D element
      const plane3D: Plane3DByTraces = {
        id: this.plane3DId,
        kind: 'Plane3DByTraces',
        name: planeName,
        traceHId: this.params.traceHId,
        traceVId: this.params.traceVId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#0088ff', opacity: 0.3 }
      };

      // 7. Create BHL projection elements
      // For MVP, create placeholder BHL projections
      // Full implementation would compute actual BHL intersections
      const bhlProjectionH: BHLProjection2D = {
        id: this.bhlProjectionHId,
        kind: 'BHLProjection2D',
        name: `${bhlName}_H`,
        planeId: planeH.id,
        sourcePlane3DId: this.plane3DId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#ff8800', lineStyle: 'dashed' }
      };

      const bhlProjectionV: BHLProjection2D = {
        id: this.bhlProjectionVId,
        kind: 'BHLProjection2D',
        name: `${bhlName}_V`,
        planeId: planeV.id,
        sourcePlane3DId: this.plane3DId,
        createdBy: this.params.actionId,
        infeasible: false,
        visualStyle: { ...defaultVisualStyle, color: '#ff8800', lineStyle: 'dashed' }
      };

      // 8. Create BHL metadata entity
      const bhl = createBrokenHingeLine(
        this.bhlId,
        bhlName,
        this.plane3DId,
        this.bhlProjectionHId,
        this.bhlProjectionVId,
        planeH.id,
        planeV.id
      );

      // 9. Build operations
      const addPlane3DOp = new AddElementOp(
        generateOperationId(),
        `/world/elements3D/${this.plane3DId}`,
        plane3D,
        this.worldStore
      );

      const addBHLProjectionHOp = new AddElementOp(
        generateOperationId(),
        `/world/elements2D/${this.bhlProjectionHId}`,
        bhlProjectionH,
        this.worldStore
      );

      const addBHLProjectionVOp = new AddElementOp(
        generateOperationId(),
        `/world/elements2D/${this.bhlProjectionVId}`,
        bhlProjectionV,
        this.worldStore
      );

      // 10. Add dependency edges
      const addDependenciesOp = new AddDependencyEdgesOp(
        generateOperationId(),
        [
          { from: this.params.traceHId, to: this.plane3DId },
          { from: this.params.traceVId, to: this.plane3DId },
          { from: this.plane3DId, to: this.bhlProjectionHId },
          { from: this.plane3DId, to: this.bhlProjectionVId }
        ],
        this.worldStore
      );

      // 11. Execute operations
      this.addAndExecute(addPlane3DOp);
      this.addAndExecute(addBHLProjectionHOp);
      this.addAndExecute(addBHLProjectionVOp);
      this.addAndExecute(addDependenciesOp);

      // 12. Store BHL metadata in worldStore
      if (!this.worldStore.brokenHingeLines) {
        this.worldStore.brokenHingeLines = new Map();
      }
      this.worldStore.brokenHingeLines.set(this.bhlId, bhl);

      return {
        success: true,
        outputs: {
          plane3DId: this.plane3DId,
          bhlId: this.bhlId,
          bhlProjectionHId: this.bhlProjectionHId,
          bhlProjectionVId: this.bhlProjectionVId,
          planeName,
          bhlName
        }
      };

    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Unknown error during 3D plane creation'
      };
    }
  }
}
