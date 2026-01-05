/**
 * CreateLineAction - Records creation of a line between two points
 * 
 * Tracks line creation with its defining points as inputs.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateLineActionParameters extends ActionParameters {
  planeId: string;
  point1Id: string;
  point2Id: string;
}

export function createLineAction(
  lineId: string,
  planeId: string,
  point1Id: string,
  point2Id: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateLine',
    timestamp: new Date(),
    inputs: [point1Id, point2Id],  // Line depends on two points
    outputs: [lineId],
    parameters: {
      planeId,
      point1Id,
      point2Id
    },
    description: `Line on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
