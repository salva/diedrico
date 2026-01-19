/**
 * Element3DActions - ProcessTree records for 3D element creation
 *
 * These actions are produced by 3D element operations (Phase 78).
 * They track dependencies between 2D projections and 3D elements.
 */

import type { Action, ActionParameters } from '../Action';

export interface Add3DPointActionParameters extends ActionParameters {
  pointId: string;
  projection1Id: string;
  projection2Id: string;
  plane1Id: string;
  plane2Id: string;
  label?: string;
}

/**
 * Create an action for adding a 3D point from two 2D projections
 * 
 * Dependencies: The 3D point depends on its two 2D point projections.
 * When a 2D point changes, the 3D point must be invalidated and reconstructed.
 */
export function createAdd3DPointAction(
  pointId: string,
  projection1Id: string,
  projection2Id: string,
  plane1Id: string,
  plane2Id: string,
  label?: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'Add3DPoint',
    timestamp: new Date(),
    inputs: [projection1Id, projection2Id],  // Depends on 2D projections
    outputs: [pointId],                       // Produces 3D point
    parameters: { pointId, projection1Id, projection2Id, plane1Id, plane2Id, label },
    description: label ? `Add 3D point ${label}` : `Add 3D point`
  };
}

export interface Add3DLineActionParameters extends ActionParameters {
  lineId: string;
  projection1Id: string;
  projection2Id: string;
  plane1Id: string;
  plane2Id: string;
  label?: string;
}

/**
 * Create an action for adding a 3D line from two 2D projections
 * 
 * Dependencies: The 3D line depends on its two 2D line projections.
 * When a 2D line changes, the 3D line must be invalidated and reconstructed.
 */
export function createAdd3DLineAction(
  lineId: string,
  projection1Id: string,
  projection2Id: string,
  plane1Id: string,
  plane2Id: string,
  label?: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'Add3DLine',
    timestamp: new Date(),
    inputs: [projection1Id, projection2Id],  // Depends on 2D projections
    outputs: [lineId],                        // Produces 3D line
    parameters: { lineId, projection1Id, projection2Id, plane1Id, plane2Id, label },
    description: label ? `Add 3D line ${label}` : `Add 3D line`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
