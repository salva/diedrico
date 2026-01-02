/**
 * CreateSegmentAction - Records creation of a segment between two points
 * 
 * Tracks segment creation with its defining points as inputs.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §ConstructiveAction
 */

import type { Action, ActionParameters } from '../Action';

export interface CreateSegmentActionParameters extends ActionParameters {
  planeId: string;
  point1Id: string;
  point2Id: string;
}

export function createSegmentAction(
  segmentId: string,
  planeId: string,
  point1Id: string,
  point2Id: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'CreateSegment',
    timestamp: new Date(),
    inputs: [point1Id, point2Id],  // Segment depends on two points
    outputs: [segmentId],
    parameters: {
      planeId,
      point1Id,
      point2Id
    },
    description: `Create segment on ${planeId}`
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
