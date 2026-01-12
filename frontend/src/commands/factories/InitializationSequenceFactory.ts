import type { World } from '../../domain/world/World';
import type { Command } from '../Command';
import {
  CreateInitializationSubprocessOp,
  AddPlane3DOp,
  AddProjectionPlaneOp,
  AddOriginPoint2DOp,
  AddHingeLineOp,
  AddHalfHingeLine2DOp,
  SetActivePlaneOp
} from '../operations/world/InitializationOps';
import { Vector3 } from 'three';

/**
 * Factory: Build operation sequence for world initialization
 * 
 * Creates all fundamental geometric structures by adding operations to the provided Command:
 * - ProcessTree subprocess for organization
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
 * @param _world World instance (not used - operations get World from Command)
 * @param cmd Open Command to which operations will be added
 */
export function buildWorldInitialization(_world: World, cmd: Command): void {
  // Step 1: Create initialization subprocess
  // This organizes all initialization elements under a dedicated subprocess in the ProcessTree
  cmd.addAndExecute(new CreateInitializationSubprocessOp('World Initialization'));
  
  // Step 2-3: Create 3D planes
  // Operations generate IDs internally via world.generatePlaneId()
  const planeHOp = new AddPlane3DOp('horizontal');
  cmd.addAndExecute(planeHOp);
  const planeHId = planeHOp.outputs.planeId as string;
  
  const planeVOp = new AddPlane3DOp('vertical');
  cmd.addAndExecute(planeVOp);
  const planeVId = planeVOp.outputs.planeId as string;
  
  // Step 4-5: Create projection planes
  // Operations generate IDs internally via world.generateProjPlaneId()
  const projPlaneHOp = new AddProjectionPlaneOp(planeHId, 'horizontal');
  cmd.addAndExecute(projPlaneHOp);
  const projPlaneHId = projPlaneHOp.outputs.projPlaneId as string;
  
  const projPlaneVOp = new AddProjectionPlaneOp(planeVId, 'vertical');
  cmd.addAndExecute(projPlaneVOp);
  const projPlaneVId = projPlaneVOp.outputs.projPlaneId as string;
  
  // Step 6-7: Create origin points
  // Every projection plane needs an origin (0,0) point for coordinate system
  cmd.addAndExecute(new AddOriginPoint2DOp(projPlaneHId, new Vector3(0, 0, 1)));
  cmd.addAndExecute(new AddOriginPoint2DOp(projPlaneVId, new Vector3(0, 0, 1)));
  
  // Step 8: Create hinge line
  // The hinge line is the 3D line where the two planes intersect (the x-axis)
  // Operation generates ID internally via world.generateHingeLineId()
  const hingeLineOp = new AddHingeLineOp(projPlaneHId, projPlaneVId);
  cmd.addAndExecute(hingeLineOp);
  const hingeLineId = hingeLineOp.outputs.hingeLineId as string;
  
  // Step 9-10: Create half hinge lines
  // Each projection plane gets a half hinge line (its local 2D representation of the hinge)
  const hingePoint = new Vector3(0, 0, 1); // Start at origin
  const hingeDirection = new Vector3(1, 0, 0); // Along x-axis
  cmd.addAndExecute(new AddHalfHingeLine2DOp(projPlaneHId, hingeLineId, hingePoint, hingeDirection));
  cmd.addAndExecute(new AddHalfHingeLine2DOp(projPlaneVId, hingeLineId, hingePoint, hingeDirection));
  
  // Step 11: Set active plane
  // Default to horizontal plane as the active drawing surface
  cmd.addAndExecute(new SetActivePlaneOp(projPlaneHId));
}
