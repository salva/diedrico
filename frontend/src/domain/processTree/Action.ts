/**
 * Action types for construction operations
 */

import type { VisualStyle } from '../world/VisualStyle';

/**
 * Action type enumeration
 */
export enum ActionType {
  // Point tools
  CreateFreePoint = 'CreateFreePoint',
  CreatePointOnElement = 'CreatePointOnElement',
  CreateIntersectionPoint = 'CreateIntersectionPoint',
  CreateMidpoint = 'CreateMidpoint',
  
  // Segment/Line tools
  CreateSegment = 'CreateSegment',
  CreateLine = 'CreateLine',
  CreateParallelLine = 'CreateParallelLine',
  CreatePerpendicularLine = 'CreatePerpendicularLine',
  
  // Circle tools
  CreateCircleCenterRadius = 'CreateCircleCenterRadius',
  CreateCircleCenterPoint = 'CreateCircleCenterPoint',
  CreateCircleThreePoints = 'CreateCircleThreePoints',
  
  // Dihedral tools
  CreateGuide = 'CreateGuide',
  TransportPoint = 'TransportPoint',
  TransportDistance = 'TransportDistance',
  
  // 3D tools
  Create3DPoint = 'Create3DPoint',
  Create3DLine = 'Create3DLine',
  Create3DSegment = 'Create3DSegment',
  Create3DPlane = 'Create3DPlane'
}

/**
 * Constructive action - records one user operation
 */
export interface ConstructiveAction {
  id: string;
  type: 'action';
  actionType: ActionType;
  timestamp: Date;
  inputs: string[];                 // ElementIds this action depends on
  outputs: string[];                // ElementIds this action produces
  parameters: Record<string, any>;  // Tool-specific parameters
  infeasible: boolean;              // Computed from validation
  infeasibilityReason?: string;     // Human-readable explanation
  visualStyle?: VisualStyle;        // Style applied to outputs
}

/**
 * Factory function to create a constructive action
 */
export function createConstructiveAction(
  id: string,
  actionType: ActionType,
  parameters: Record<string, any> = {},
  options?: Partial<ConstructiveAction>
): ConstructiveAction {
  return {
    id,
    type: 'action',
    actionType,
    timestamp: new Date(),
    inputs: [],
    outputs: [],
    parameters,
    infeasible: false,
    ...options
  };
}
