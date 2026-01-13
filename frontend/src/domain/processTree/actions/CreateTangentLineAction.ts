/**
 * CreateTangentLineAction - Records creation of tangent lines to circles
 * 
 * Phase 60: Tangent line to circle through external point
 * Phase 61: Tangent line to circle parallel to reference line
 * 
 * Tracks tangent line creation with appropriate dependencies.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

// ===== Phase 60: Tangent Through Point =====

export interface CreateTangentLineToCircleThroughPointActionParameters extends ActionParameters {
  planeId: string;
  circleId: string;
  throughPointId: string;
  tangentIndex: 0 | 1;
}

export function createTangentLineToCircleThroughPointAction(
  lineId: string,
  planeId: string,
  circleId: string,
  throughPointId: string,
  tangentIndex: 0 | 1
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateTangentLineToCircleThroughPoint',
    timestamp: new Date(),
    inputs: [circleId, throughPointId],  // Tangent depends on circle and through-point
    outputs: [lineId],
    parameters: {
      planeId,
      circleId,
      throughPointId,
      tangentIndex
    } as CreateTangentLineToCircleThroughPointActionParameters,
    description: `Tangent line to circle through point on ${planeId}`
  };
}

// ===== Phase 61: Tangent Parallel to Line =====

export interface CreateTangentLineToCircleParallelToLineActionParameters extends ActionParameters {
  planeId: string;
  circleId: string;
  referenceLineId: string;
  tangentIndex: 0 | 1;
}

export function createTangentLineToCircleParallelToLineAction(
  lineId: string,
  planeId: string,
  circleId: string,
  referenceLineId: string,
  tangentIndex: 0 | 1
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateTangentLineToCircleParallelToLine',
    timestamp: new Date(),
    inputs: [circleId, referenceLineId],  // Tangent depends on circle and reference line
    outputs: [lineId],
    parameters: {
      planeId,
      circleId,
      referenceLineId,
      tangentIndex
    } as CreateTangentLineToCircleParallelToLineActionParameters,
    description: `Tangent line to circle parallel to line on ${planeId}`
  };
}

// ===== Utility =====

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
