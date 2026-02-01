/**
 * Initialization actions - ProcessTree records for World initialization
 *
 * These actions are produced by initialization operations (Phase 47).
 * They are grouped under the "World Initialization" subprocess.
 */

import type { Action, ActionParameters } from '../Action';

export interface InitializePlane3DActionParameters extends ActionParameters {
  planeId: string;
  label?: string;
}

export function createInitializePlane3DAction(planeId: string, label?: string): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'InitializePlane3D',
    timestamp: new Date(),
    inputs: [],
    outputs: [planeId],
    parameters: { planeId, label },
    description: label ? `Plane ${label}` : `Plane ${planeId}`
  };
}

export interface InitializeProjectionPlaneActionParameters extends ActionParameters {
  projPlaneId: string;
  plane3DId: string;
  orientation: 'horizontal' | 'vertical';
}

export function createInitializeProjectionPlaneAction(
  projPlaneId: string,
  plane3DId: string,
  orientation: 'horizontal' | 'vertical'
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'InitializeProjectionPlane',
    timestamp: new Date(),
    inputs: [plane3DId],
    outputs: [projPlaneId],
    parameters: { projPlaneId, plane3DId, orientation },
    description: `Projection plane (${orientation})`
  };
}

export interface InitializeOriginPoint2DActionParameters extends ActionParameters {
  pointId: string;
  projPlaneId: string;
  label?: string;
}

export function createInitializeOriginPoint2DAction(
  pointId: string,
  projPlaneId: string,
  label?: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'InitializeOriginPoint2D',
    timestamp: new Date(),
    inputs: [projPlaneId],
    outputs: [pointId],
    parameters: { pointId, projPlaneId, label },
    description: label ? `Origin ${label}` : 'Origin point'
  };
}

export interface InitializeHingeLineActionParameters extends ActionParameters {
  hingeLineId: string;
  plane1Id: string;
  plane2Id: string;
}

export function createInitializeHingeLineAction(
  hingeLineId: string,
  plane1Id: string,
  plane2Id: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'InitializeHingeLine',
    timestamp: new Date(),
    inputs: [plane1Id, plane2Id],
    outputs: [hingeLineId],
    parameters: { hingeLineId, plane1Id, plane2Id },
    description: 'Hinge line'
  };
}

export interface InitializeHalfHingeLine2DActionParameters extends ActionParameters {
  lineId: string;
  projPlaneId: string;
  hingeLineId: string;
}

export function createInitializeHalfHingeLine2DAction(
  lineId: string,
  projPlaneId: string,
  hingeLineId: string
): Action {
  return {
    id: generateActionId(),
    type: 'action',
    actionType: 'InitializeHalfHingeLine2D',
    timestamp: new Date(),
    inputs: [projPlaneId, hingeLineId],
    outputs: [lineId],
    parameters: { lineId, projPlaneId, hingeLineId },
    description: 'Half hinge line'
  };
}

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
