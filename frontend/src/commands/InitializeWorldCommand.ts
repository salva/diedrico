/**
 * InitializeWorldCommand - Non-undoable command for World initialization (Phase 47)
 * 
 * This command sets up the fundamental geometric structure when a new World is created:
 * - Two 3D planes (P_H horizontal, P_V vertical)
 * - Two projection planes (proj_plane_1 for H, proj_plane_2 for V)
 * - Origin points on each projection plane
 * - Hinge line connecting the two planes
 * - Half hinge lines (2D representations) on each projection plane
 * - "World Initialization" subprocess in ProcessTree
 * 
 * Architecture:
 * - Orchestrates multiple atomic initialization operations
 * - Non-undoable (canUndo() returns false)
 * - Replaces imperative World.initializeFixedElements() method
 * - Uses Phase 46 generated IDs (no hardcoded strings)
 * 
 * Design:
 * - Operations execute in specific order to satisfy dependencies
 * - Each operation is atomic and can be individually serialized
 * - Command itself is not added to undo stack (non-undoable)
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §World Initialization
 */

import { Vector3 } from 'three';
import { Command } from './Command';
import type { World } from '@/domain/world/World';
import {
  AddPlane3DOp,
  AddProjectionPlaneOp,
  AddOriginPoint2DOp,
  AddHingeLineOp,
  AddHalfHingeLine2DOp,
  CreateInitializationSubprocessOp,
  SetActivePlaneOp
} from './operations/world/InitializationOps';

/**
 * InitializeWorldCommand - Creates a non-undoable command that sets up fundamental World geometry
 * 
 * Factory function that creates a Command with all necessary initialization operations.
 * The returned command has canUndo() overridden to return false.
 * 
 * Execution sequence:
 * 1. Create subprocess for organizing initialization actions
 * 2. Create horizontal 3D plane (P_H)
 * 3. Create vertical 3D plane (P_V)
 * 4. Create horizontal projection plane (proj_plane_1)
 * 5. Create vertical projection plane (proj_plane_2)
 * 6. Create origin point on horizontal plane
 * 7. Create origin point on vertical plane
 * 8. Create hinge line connecting both planes
 * 9. Create half hinge line on horizontal plane
 * 10. Create half hinge line on vertical plane
 */
export class InitializeWorldCommand extends Command {
  
  constructor(world: World) {
    super('Initialize World', world);
    
    // Build the command by adding all initialization operations
    this.buildInitializationSequence();
    
    // Override canUndo to make this command non-undoable
    this.canUndo = () => false;
  }

  /**
   * Build the complete initialization sequence
   */
  private buildInitializationSequence(): void {
    // Step 1: Create initialization subprocess
    this.addAndExecute(new CreateInitializationSubprocessOp('World Initialization'));

    // Generate IDs for the geometric structure
    // Note: We use predictable IDs for the fundamental structure
    const planeHId = 'plane_H';
    const planeVId = 'plane_V';
    const projPlaneHId = 'proj_plane_1';
    const projPlaneVId = 'proj_plane_2';
    const hingeLineId = 'hinge_line_1';
    
    // Phase 46: Store semantic references in World for these IDs
    // These enable getHorizontalPlane(), getVerticalPlane() etc.
    (this.world as any).horizontalPlaneId = projPlaneHId;
    (this.world as any).verticalPlaneId = projPlaneVId;
    (this.world as any).mainHingeLineId = hingeLineId;
    
    // Steps 2-3: Create 3D planes
    this.addAndExecute(new AddPlane3DOp(planeHId, 'horizontal'));
    this.addAndExecute(new AddPlane3DOp(planeVId, 'vertical'));

    // Steps 4-5: Create projection planes
    this.addAndExecute(new AddProjectionPlaneOp(projPlaneHId, planeHId, 'horizontal'));
    this.addAndExecute(new AddProjectionPlaneOp(projPlaneVId, planeVId, 'vertical'));

    // Steps 6-7: Create origin points (locked at 0,0)
    const originPos = new Vector3(0, 0, 1);
    const originHOp = new AddOriginPoint2DOp(projPlaneHId, originPos);
    this.addAndExecute(originHOp);
    const originVOp = new AddOriginPoint2DOp(projPlaneVId, originPos);
    this.addAndExecute(originVOp);
    
    // Store origin IDs from operation outputs
    if (originHOp.outputs.pointId) {
      (this.world as any).horizontalOriginId = originHOp.outputs.pointId;
    }
    if (originVOp.outputs.pointId) {
      (this.world as any).verticalOriginId = originVOp.outputs.pointId;
    }
    
    // Origin point O at (0,0,0) in 3D space
    (this.world as any).originPoint = new Vector3(0, 0, 0);

    // Step 8: Create hinge line
    this.addAndExecute(new AddHingeLineOp(hingeLineId, projPlaneHId, projPlaneVId));

    // Steps 9-10: Create half hinge lines (2D representations at v=0)
    const hingePoint = new Vector3(0, 0, 1);  // Point at origin
    const hingeDirection = new Vector3(1, 0, 0);  // Horizontal direction
    this.addAndExecute(new AddHalfHingeLine2DOp(projPlaneHId, hingeLineId, hingePoint, hingeDirection));
    this.addAndExecute(new AddHalfHingeLine2DOp(projPlaneVId, hingeLineId, hingePoint, hingeDirection));
    
    // Step 11: Set horizontal plane as initially active
    this.addAndExecute(new SetActivePlaneOp(projPlaneHId));
  }
}
