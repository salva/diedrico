/**
 * CreateCircleCommand
 * 
 * Command for creating circles with three construction methods:
 * 1. center+radius: Circle2DByCenterAndRadius
 * 2. center+point: Circle2DByCenterAndPoint
 * 3. three-points: Circle2DByThreePoints (validated for collinearity)
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import { AddDependencyEdgesOp } from './operations/DependencyOperations';
import type { OperationResult } from '../types/CommandTypes';
import { generateCircleId, generateCommandId, generateOperationId } from '@/domain/world/IdGenerator';
import type { Circle2DByCenterAndRadius, Circle2DByCenterAndPoint, Circle2DByThreePoints, Point2D } from '@/types/ElementTypes';

type CircleConstructionMethod =
  | { type: 'center-radius'; centerPointId: string; radius: number }
  | { type: 'center-point'; centerPointId: string; circumferencePointId: string }
  | { type: 'three-points'; point1Id: string; point2Id: string; point3Id: string };

export interface CreateCircleCommandParams {
  method: CircleConstructionMethod;
  planeId: string;
  actionId: string;
  name?: string;
}

export class CreateCircleCommand extends Command {
  private circleId: string;
  private readonly params: CreateCircleCommandParams;
  private worldStore: any;

  constructor(params: CreateCircleCommandParams, worldStore: any) {
    super(generateCommandId(), CreateCircleCommand.getDescription(params.method));
    this.params = params;
    this.worldStore = worldStore;
    this.circleId = generateCircleId();
  }

  getDescription(): string {
    return CreateCircleCommand.getDescription(this.params.method);
  }

  static getDescription(method: CircleConstructionMethod): string {
    switch (method.type) {
      case 'center-radius':
        return `Create circle with center and radius ${method.radius}`;
      case 'center-point':
        return 'Create circle through center and point on circumference';
      case 'three-points':
        return 'Create circle through three points';
      default:
        return 'Create circle';
    }
  }

  getCircleId(): string {
    return this.circleId;
  }

  validate(): { valid: boolean; error?: string } {
    const { method, planeId } = this.params;

    switch (method.type) {
      case 'center-radius': {
        // Validate center point exists
        const centerPoint = this.worldStore.elements2D.get(method.centerPointId);
        if (!centerPoint) {
          return {
            valid: false,
            error: `Center point ${method.centerPointId} does not exist`
          };
        }

        // Validate center point is on same plane
        if (centerPoint.planeId !== planeId) {
          return {
            valid: false,
            error: `Center point must be on the same plane as the circle`
          };
        }

        // Validate radius is positive
        if (method.radius <= 0) {
          return {
            valid: false,
            error: `Radius must be positive, got ${method.radius}`
          };
        }

        if (!isFinite(method.radius)) {
          return {
            valid: false,
            error: `Radius must be a finite number`
          };
        }

        return { valid: true };
      }

      case 'center-point': {
        // Validate center point exists
        const centerPoint = this.worldStore.elements2D.get(method.centerPointId);
        if (!centerPoint) {
          return {
            valid: false,
            error: `Center point ${method.centerPointId} does not exist`
          };
        }

        // Validate circumference point exists
        const circumferencePoint = this.worldStore.elements2D.get(method.circumferencePointId);
        if (!circumferencePoint) {
          return {
            valid: false,
            error: `Circumference point ${method.circumferencePointId} does not exist`
          };
        }

        // Validate points are different
        if (method.centerPointId === method.circumferencePointId) {
          return {
            valid: false,
            error: `Center and circumference points must be different`
          };
        }

        // Validate both points are on same plane
        if (centerPoint.planeId !== planeId || circumferencePoint.planeId !== planeId) {
          return {
            valid: false,
            error: `All points must be on the same plane as the circle`
          };
        }

        return { valid: true };
      }

      case 'three-points': {
        // Validate all three points exist
        const point1 = this.worldStore.elements2D.get(method.point1Id);
        const point2 = this.worldStore.elements2D.get(method.point2Id);
        const point3 = this.worldStore.elements2D.get(method.point3Id);

        if (!point1) {
          return {
            valid: false,
            error: `Point ${method.point1Id} does not exist`
          };
        }

        if (!point2) {
          return {
            valid: false,
            error: `Point ${method.point2Id} does not exist`
          };
        }

        if (!point3) {
          return {
            valid: false,
            error: `Point ${method.point3Id} does not exist`
          };
        }

        // Validate all points are different
        if (method.point1Id === method.point2Id || 
            method.point1Id === method.point3Id || 
            method.point2Id === method.point3Id) {
          return {
            valid: false,
            error: `All three points must be different`
          };
        }

        // Validate all points are on same plane
        if (point1.planeId !== planeId || point2.planeId !== planeId || point3.planeId !== planeId) {
          return {
            valid: false,
            error: `All points must be on the same plane as the circle`
          };
        }

        return { valid: true };
      }

      default:
        return {
          valid: false,
          error: 'Unknown circle construction method'
        };
    }
  }

  /**
   * Extract coordinates from a Point2D element (handles all point variants)
   */
  private getPointCoordinates(pointId: string): { x: number; y: number } | null {
    const point = this.worldStore.elements2D.get(pointId) as Point2D | undefined;
    if (!point) return null;

    switch (point.kind) {
      case 'Point2DFree':
      case 'Point2DDerived':
        return { x: point.x, y: point.y };
      case 'Point2DFromIntersection':
      case 'Point2DFromIntersection':
        // For non-free points, coordinates need to be computed during recomputation
        // For now, use placeholder values (will be implemented in recomputation phase)
        return { x: 0, y: 0 };
      default:
        return null;
    }
  }

  /**
   * Check if three points are collinear (within epsilon)
   * Uses cross product to detect collinearity
   */
  private arePointsCollinear(point1Id: string, point2Id: string, point3Id: string): boolean {
    const p1 = this.getPointCoordinates(point1Id);
    const p2 = this.getPointCoordinates(point2Id);
    const p3 = this.getPointCoordinates(point3Id);

    if (!p1 || !p2 || !p3) {
      return false; // Can't determine, assume not collinear
    }

    // Calculate cross product: (p2 - p1) × (p3 - p1)
    const v1x = p2.x - p1.x;
    const v1y = p2.y - p1.y;
    const v2x = p3.x - p1.x;
    const v2y = p3.y - p1.y;

    const crossProduct = Math.abs(v1x * v2y - v1y * v2x);

    // Use epsilon threshold for collinearity detection
    const epsilon = 0.0001;
    return crossProduct < epsilon;
  }

  /**
   * Check if center and circumference points are coincident
   */
  private arePointsCoincident(point1Id: string, point2Id: string): boolean {
    const p1 = this.getPointCoordinates(point1Id);
    const p2 = this.getPointCoordinates(point2Id);

    if (!p1 || !p2) {
      return false;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const epsilon = 0.0001;
    return distance < epsilon;
  }

  execute(): OperationResult {
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        outputs: {},
        error: validation.error || 'Validation failed'
      };
    }

    try {
      const { method, planeId, actionId, name } = this.params;

      // Detect infeasibility based on construction method
      let isInfeasible = false;
      let infeasibilityReason: string | undefined;

      switch (method.type) {
        case 'center-radius':
          // No infeasibility check needed for explicit radius
          break;
        case 'center-point':
          // Check if center and circumference are coincident
          if (this.arePointsCoincident(method.centerPointId, method.circumferencePointId)) {
            isInfeasible = true;
            infeasibilityReason = 'Center and circumference points are coincident (zero radius)';
          }
          break;
        case 'three-points':
          // Check if three points are collinear
          if (this.arePointsCollinear(method.point1Id, method.point2Id, method.point3Id)) {
            isInfeasible = true;
            infeasibilityReason = 'Three points are collinear (cannot define circle)';
          }
          break;
      }

      // Create circle element based on construction method
      let circle: Circle2DByCenterAndRadius | Circle2DByCenterAndPoint | Circle2DByThreePoints;
      let dependencyEdges: Array<{ from: string; to: string }> = [];

      switch (method.type) {
        case 'center-radius':
          circle = {
            id: this.circleId,
            kind: 'Circle2DByCenterAndRadius',
            planeId,
            centerPointId: method.centerPointId,
            radius: method.radius,
            name: name || this.circleId,
            createdBy: actionId,
            infeasible: isInfeasible,
            visualStyle: {
              color: isInfeasible ? '#f44336' : '#00bcd4', // Red if infeasible, cyan if feasible
              lineWidth: 2,
              lineStyle: isInfeasible ? 'dashed' : 'solid',
              opacity: isInfeasible ? 0.6 : 1.0,
              visible: true,
              inherited: false
            }
          };
          dependencyEdges = [
            { from: method.centerPointId, to: this.circleId }
          ];
          break;

        case 'center-point':
          circle = {
            id: this.circleId,
            kind: 'Circle2DByCenterAndPoint',
            planeId,
            centerPointId: method.centerPointId,
            circumferencePointId: method.circumferencePointId,
            name: name || this.circleId,
            createdBy: actionId,
            infeasible: isInfeasible,
            visualStyle: {
              color: isInfeasible ? '#f44336' : '#4caf50', // Red if infeasible, green if feasible
              lineWidth: 2,
              lineStyle: isInfeasible ? 'dashed' : 'solid',
              opacity: isInfeasible ? 0.6 : 1.0,
              visible: true,
              inherited: false
            }
          };
          dependencyEdges = [
            { from: method.centerPointId, to: this.circleId },
            { from: method.circumferencePointId, to: this.circleId }
          ];
          break;

        case 'three-points':
          circle = {
            id: this.circleId,
            kind: 'Circle2DByThreePoints',
            planeId,
            point1Id: method.point1Id,
            point2Id: method.point2Id,
            point3Id: method.point3Id,
            name: name || this.circleId,
            createdBy: actionId,
            infeasible: isInfeasible,
            visualStyle: {
              color: isInfeasible ? '#f44336' : '#9c27b0', // Red if infeasible, purple if feasible
              lineWidth: 2,
              lineStyle: isInfeasible ? 'dashed' : 'solid',
              opacity: isInfeasible ? 0.6 : 1.0,
              visible: true,
              inherited: false
            }
          };
          dependencyEdges = [
            { from: method.point1Id, to: this.circleId },
            { from: method.point2Id, to: this.circleId },
            { from: method.point3Id, to: this.circleId }
          ];
          break;
      }

      // Add element to world
      const elementPath = `/world/elements2D/${this.circleId}`;
      const addOp = new AddElementOp(
        generateOperationId(),
        elementPath,
        circle as any,
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
          circleId: this.circleId,
          elementPath: elementPath,
          infeasible: isInfeasible,
          infeasibilityReason
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to create circle'
      };
    }
  }
}
