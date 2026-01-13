/**
 * Action - Base interface for construction actions in the process tree
 * 
 * Actions record geometric construction operations with their inputs/outputs.
 * They track dependencies and enable parametric behavior.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

export type ActionType =
  | 'CreateFreePoint'
  | 'CreatePointOnElement'
  | 'CreateIntersectionPoint'
  | 'CreateLine'
  | 'CreateSegment'
  | 'CreateCircle'
  | 'CreateGuide'
  | 'TransportPoint'
  | 'TransportDistance'
  | 'InitializePlane3D'
  | 'InitializeProjectionPlane'
  | 'InitializeOriginPoint2D'
  | 'InitializeHingeLine'
  | 'InitializeHalfHingeLine2D'
  | 'CreatePerpendicularLine'
  | 'CreateTangentLineToCircleThroughPoint'
  | 'CreateTangentLineToCircleParallelToLine';

export interface Action {
  id: string;                    // UUID
  type: 'action';                // Node type in process tree
  actionType: ActionType;        // Specific action type
  timestamp: Date;               // When action was performed
  inputs: string[];              // Element IDs this action depends on
  outputs: string[];             // Element IDs this action produces
  parameters: Record<string, any>; // Tool-specific parameters
  description: string;           // Human-readable description
}

export interface ActionParameters {
  [key: string]: any;
}
