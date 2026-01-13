/**
 * CreateParallelLineAction - Records creation of a line parallel to a reference line
 * 
 * Tracks parallel line creation with reference line and through-point as inputs.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateParallelLineActionParameters extends ActionParameters {
  planeId: string;
  referenceLineId: string;
  throughPointId: string;
}

export function createParallelLineAction(
  lineId: string,
  planeId: string,
  referenceLineId: string,
  throughPointId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateParallelLine',
    timestamp: new Date(),
    inputs: [referenceLineId, throughPointId],  // Parallel line depends on reference line and through-point
    outputs: [lineId],
    parameters: {
      planeId,
      referenceLineId,
      throughPointId
    },
    description: `Parallel line on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
