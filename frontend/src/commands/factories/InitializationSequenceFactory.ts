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
 * @param world World instance for ID generation
 * @param cmd Open Command to which operations will be added
 */
export function buildWorldInitialization(world: World, cmd: Command): void {
  // Step 1: Create initialization subprocess
  // This organizes all initialization elements under a dedicated subprocess in the ProcessTree
  cmd.addAndExecute(new CreateInitializationSubprocessOp('World Initialization'));
  
  // Generate IDs for geometric structure using World's ID generators
  const planeHId = world.generatePlaneId(); // Horizontal 3D plane
  const planeVId = world.generatePlaneId(); // Vertical 3D plane
  const projPlaneHId = world.generateProjPlaneId(); // Horizontal projection plane
  const projPlaneVId = world.generateProjPlaneId(); // Vertical projection plane
  
  // Step 2-3: Create 3D planes
  // These represent the infinite 3D planes in abstract geometric space
  cmd.addAndExecute(new AddPlane3DOp(planeHId, 'horizontal'));
  cmd.addAndExecute(new AddPlane3DOp(planeVId, 'vertical'));
  
  // Step 4-5: Create projection planes
  // These are the drawable 2D canvases that correspond to the 3D planes
  cmd.addAndExecute(new AddProjectionPlaneOp(projPlaneHId, planeHId, 'horizontal'));
  cmd.addAndExecute(new AddProjectionPlaneOp(projPlaneVId, planeVId, 'vertical'));
  
  // Step 6-7: Create origin points
  // Every projection plane needs an origin (0,0) point for coordinate system
  cmd.addAndExecute(new AddOriginPoint2DOp(projPlaneHId, new Vector3(0, 0, 1)));
  cmd.addAndExecute(new AddOriginPoint2DOp(projPlaneVId, new Vector3(0, 0, 1)));
  
  // Step 8: Create hinge line
  // The hinge line is the 3D line where the two planes intersect (the x-axis)
  const hingeLineId = world.generateHingeLineId();
  cmd.addAndExecute(new AddHingeLineOp(hingeLineId, projPlaneHId, projPlaneVId));
  
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
