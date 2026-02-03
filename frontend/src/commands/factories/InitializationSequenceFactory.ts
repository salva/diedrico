import type { World } from '../../domain/world/World';
import type { Command } from '../Command';
import {
  AddPlane3DFixedOp,
  AddProjectionPlaneFixedOp,
  AddOriginPoint2DOp
} from '../operations/world/InitializationOps';
import { AddProcessTreeActionOp } from '../operations/processTree/AddProcessTreeActionOp';
import {
  createInitializePlane3DAction,
  createInitializeProjectionPlaneAction,
  createInitializeOriginPoint2DAction
} from '@/domain/processTree/actions/InitializeWorldActions';
import { Vector3, Vector4, Matrix3 } from 'three';
import { Matrix4x3 } from '@/utils/threeUtils';
import { buildHingeLineWithHalves } from './HingeLineSequenceFactory';

/**
 * Factory: Build operation sequence for world initialization
 * 
 * Creates all fundamental geometric structures by adding operations to the provided Command:
 * - Two 3D planes (P_H horizontal, P_V vertical)
 * - Two projection planes 
 * - Origin points on each projection plane
 * - Hinge line connecting the two planes
 * - Half hinge lines (2D representations) on each projection plane
 * - Sets the active plane to horizontal
 * 
 * This factory receives an open Command and adds operations directly to it.
 * It does NOT create a Command subclass, maintaining architecture compliance.
 * 
 * CRITICAL: This factory does NOT generate element IDs. Operations generate their own IDs
 * via World/ProjectionPlane factory methods, supporting redo by storing IDs in outputs.
 * 
 * @param world World instance (used for active plane state)
 * @param cmd Open Command to which operations will be added
 * @param groupId The ID of the action group to attach operations to
 */
export function buildWorldInitialization(world: World, cmd: Command, groupId: string): void {
  // Step 2-3: Create 3D planes
  // P_H: horizontal plane (z=0), normal=(0,0,1)
  const planeHOp = new AddPlane3DFixedOp(
    new Vector4(0, 0, 0, 1),  // Point: origin (homogeneous)
    new Vector4(0, 0, 1, 0),  // Normal: +Z (homogeneous)
    'plane_PH',                // Fixed ID for determinism
    'P_H'                     // Label
  );
  cmd.addAndExecute(planeHOp);
  const planeHId = planeHOp.outputs.planeId as string;
  
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializePlane3DAction(planeHId),
    groupId
  ));
  
  // P_V: vertical plane (y=0), normal=(0,1,0)
  const planeVOp = new AddPlane3DFixedOp(
    new Vector4(0, 0, 0, 1),  // Point: origin (homogeneous)
    new Vector4(0, 1, 0, 0),  // Normal: +Y (homogeneous)
    'plane_PV',                // Fixed ID for determinism
    'P_V'                     // Label
  );
  cmd.addAndExecute(planeVOp);
  const planeVId = planeVOp.outputs.planeId as string;
  
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializePlane3DAction(planeVId),
    groupId
  ));
  
  // Step 4-5: Create projection planes with explicit transformation matrices
  // P_H: horizontal plane at z=0, v maps to domain Y
  const planeToPaper_H = new Matrix3().set(
    1, 0, 800,     // x' = u + 800
    0, 1, 500,     // y' = v + 500 (Y towards viewer = downward, no flip)
    0, 0, 1
  );
  const planeTo3D_H = new Matrix4x3().set(
    1, 0, 0,  // x = u
    0, 1, 0,  // y = v (domain Y)
    0, 0, 0,  // z = 0 (horizontal plane)
    0, 0, 1   // w = 1
  );
  // Phase 94: threeDToPlane_H computed from planeTo3D_H in realization constructor
  
  const projPlaneHOp = new AddProjectionPlaneFixedOp(planeHId, planeToPaper_H, planeTo3D_H, undefined, 'P_H');
  cmd.addAndExecute(projPlaneHOp);
  const projPlaneHId = projPlaneHOp.outputs.projPlaneId as string;
  
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeProjectionPlaneAction(projPlaneHId),
    groupId
  ));
  
  // P_V: vertical plane at y=0, v maps to domain Z
  const planeToPaper_V = new Matrix3().set(
    1, 0, 800,      // x' = u + 800
    0, -1, 500,     // y' = -v + 500 (Z upward = canvas upward, flip needed)
    0, 0, 1
  );
  const planeTo3D_V = new Matrix4x3().set(
    1, 0, 0,  // x = u
    0, 0, 0,  // y = 0 (vertical plane)
    0, 1, 0,  // z = v (domain Z)
    0, 0, 1   // w = 1
  );
  // Phase 94: threeDToPlane_V computed from planeTo3D_V in realization constructor
  
  const projPlaneVOp = new AddProjectionPlaneFixedOp(planeVId, planeToPaper_V, planeTo3D_V, undefined, 'P_V');
  cmd.addAndExecute(projPlaneVOp);
  const projPlaneVId = projPlaneVOp.outputs.projPlaneId as string;
  
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeProjectionPlaneAction(projPlaneVId),
    groupId
  ));
  
  // Step 6-7: Create origin points
  // Every projection plane needs an origin (0,0) point for coordinate system
  // Phase 53: Add labels for semantic access
  const originHOp = new AddOriginPoint2DOp(projPlaneHId, new Vector3(0, 0, 1), 'O_H');
  cmd.addAndExecute(originHOp);
  // Phase 85: Action automatically recorded removed from Op, adding explicitly
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeOriginPoint2DAction(originHOp.outputs.pointId),
    groupId
  ));

  const originVOp = new AddOriginPoint2DOp(projPlaneVId, new Vector3(0, 0, 1), 'O_V');
  cmd.addAndExecute(originVOp);
  cmd.addAndExecute(new AddProcessTreeActionOp(
    createInitializeOriginPoint2DAction(originVOp.outputs.pointId),
    groupId
  ));
  
  // Step 8-10: Create complete hinge line with both half hinge lines
  // Phase 84: No geometry arguments - computed from canonical coordinates
  buildHingeLineWithHalves(projPlaneHId, projPlaneVId, cmd, groupId);
  
  // Step 11: Set active plane
  // Default to horizontal plane as the active drawing surface
  // Phase 89: Direct state mutation (Active Plane is UI state, not Operation)
  world.setActivePlaneId(projPlaneHId);
}
