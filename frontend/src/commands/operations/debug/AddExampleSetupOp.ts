/**
 * AddExampleSetupOp - Add predefined geometric setups for testing/debugging
 * 
 * Provides quick ways to populate the canvas with specific geometric configurations
 * to facilitate testing of tools and features without manual construction.
 * 
 * Example Setups:
 * - ProjectionPlaneSetup: Two trace lines + T2' for testing auxiliary projection plane creation
 * - More setups can be added as needed
 */

import { Vector3 } from 'three';
import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { Command } from '@/commands/Command';
import { AddFreePoint2DOp } from '../world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '../world/AddLineOp';
import { PlaneSequenceFactory } from '@/services/factories/PlaneSequenceFactory';

export const EXAMPLE_SETUP_TYPE = {
  PROJECTION_PLANE_SETUP: 'projection-plane-setup',
  BASIC_3D_POINT_SETUP: 'basic-3d-point-setup',
} as const;
export type ExampleSetupType = typeof EXAMPLE_SETUP_TYPE[keyof typeof EXAMPLE_SETUP_TYPE];

/**
 * Operation to add a predefined example setup
 * 
 * This operation creates a complete geometric configuration in a single action,
 * making it easy to test complex features without manual construction.
 */
export class AddExampleSetupOp implements IOperation {
  readonly type = 'AddExampleSetup';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private createdElementIds: string[] = [];
  private command?: Command;

  constructor(setupType: ExampleSetupType) {
    this.parameters = { setupType };
  }

  apply(world: World): OperationResult {
    try {
      // Create a sub-command to group all operations
      this.command = new Command(`Add ${this.parameters.setupType} example`, world);
      
      switch (this.parameters.setupType) {
        case 'projection-plane-setup':
          this.addProjectionPlaneSetup(this.command, world);
          break;
        case 'basic-3d-point-setup':
          this.addBasic3DPointSetup(this.command, world);
          break;
        default:
          throw new Error(`Unknown setup type: ${this.parameters.setupType}`);
      }

      // Commit the sub-command
      this.command.commit();

      this.outputs = { createdIds: this.createdElementIds };
      return { success: true, outputs: this.outputs };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(_world: World): void {
    if (this.command) {
      this.command.rollback();
    }
  }

  /**
   * Add setup for testing projection plane creation
   * 
   * Creates:
   * - T1: Horizontal line on P_H (hinge trace)
   * - T2: Diagonal line on P_V (other trace)
   * - T2': Horizontal line on P_H (position line, approximate expected position)
   * 
   * After running this, user can activate CreateProjectionPlaneTool and select:
   * 1. T1 (labeled "T1_H")
   * 2. T2 (labeled "T2_V")
   * 3. T2' (labeled "T2'_H")
   */
  private addProjectionPlaneSetup(cmd: Command, world: World): void {
    // Get P_H and P_V (horizontal and vertical projection planes)
    const planes = world.getAllProjectionPlanes();
    const P_H = planes.find((p) => p.name === 'P_H');
    const P_V = planes.find((p) => p.name === 'P_V');

    if (!P_H || !P_V) {
      throw new Error('Standard projection planes P_H and P_V not found');
    }

    // === Create T1 on P_H (horizontal trace line) ===
    // Points for T1: horizontal line through middle of P_H
    const t1_p1_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_H.id!,
      new Vector3(150, 0, 1)  // x, y, z=1 (homogeneous)
    ));
    const t1_p1_id = t1_p1_result.outputs.pointId as string;
    this.createdElementIds.push(t1_p1_id);

    const t1_p2_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_H.id!,
      new Vector3(450, 0, 1)  // x, y, z=1
    ));
    const t1_p2_id = t1_p2_result.outputs.pointId as string;
    this.createdElementIds.push(t1_p2_id);

    const t1_result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
      P_H.id!,
      t1_p1_id,
      t1_p2_id
    ));
    const t1_id = t1_result.outputs.lineId as string;
    this.createdElementIds.push(t1_id);

    // Set label for T1
    const t1Line = world.getLine2D(t1_id);
    if (t1Line) {
      t1Line.label = 'T1_H';
    }

    // === Create T2 on P_V (diagonal trace line) ===
    // Points for T2: diagonal line on P_V
    const t2_p1_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_V.id!,
      new Vector3(200, 0, 1)  // on ground line
    ));
    const t2_p1_id = t2_p1_result.outputs.pointId as string;
    this.createdElementIds.push(t2_p1_id);

    const t2_p2_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_V.id!,
      new Vector3(400, 150, 1)  // raised above ground line
    ));
    const t2_p2_id = t2_p2_result.outputs.pointId as string;
    this.createdElementIds.push(t2_p2_id);

    const t2_result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
      P_V.id!,
      t2_p1_id,
      t2_p2_id
    ));
    const t2_id = t2_result.outputs.lineId as string;
    this.createdElementIds.push(t2_id);

    // Set label for T2
    const t2Line = world.getLine2D(t2_id);
    if (t2Line) {
      t2Line.label = 'T2_V';
    }

    // === Create T2' on P_H (position line - approximate expected position) ===
    // This is where T2 would appear after unfolding the 3D plane onto P_H
    // For simplicity, we create a diagonal line with similar slope
    const t2p_p1_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_H.id!,
      new Vector3(200, 80, 1)  // approximate unfolded position
    ));
    const t2p_p1_id = t2p_p1_result.outputs.pointId as string;
    this.createdElementIds.push(t2p_p1_id);

    const t2p_p2_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_H.id!,
      new Vector3(400, 120, 1)  // approximate unfolded position with slope
    ));
    const t2p_p2_id = t2p_p2_result.outputs.pointId as string;
    this.createdElementIds.push(t2p_p2_id);

    const t2p_result = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
      P_H.id!,
      t2p_p1_id,
      t2p_p2_id
    ));
    const t2p_id = t2p_result.outputs.lineId as string;
    this.createdElementIds.push(t2p_id);

    // Set label for T2'
    const t2pLine = world.getLine2D(t2p_id);
    if (t2pLine) {
      t2pLine.label = 'T2\'_H';
    }

    // === Create the auxiliary projection plane ===
    // Step 1: Create 3D plane from T1 and T2 using factory
    const { planeId: plane3DId } = PlaneSequenceFactory.create3DPlaneFromTraces(
      cmd,
      t1_id,
      t2_id,
      P_H.id!,
      P_V.id!,
      'Example Plane Q'
    );
    this.createdElementIds.push(plane3DId);

    // Steps 2-4: Create auxiliary projection plane with hinge line and ProcessTree tracking
    // Using factory method that creates plane + hinge line + ProcessTree action in one call
    const { projPlaneId } = PlaneSequenceFactory.createAuxiliaryProjectionPlane(
      cmd,
      world,   // world (needed to check if T1 is HalfHingeLine2D)
      plane3DId,
      t1_id,   // T1 (hinge trace)
      t2_id,   // T2 (other trace)
      t2p_id,  // T2' (position line)
      P_H.id!, // Hinge trace plane (connects via hinge line)
      'P_A1'   // Name for the auxiliary projection plane
    );
    this.createdElementIds.push(projPlaneId);
  }

  /**
   * Add setup for testing 3D point creation
   * 
   * Creates:
   * - Two points on P_H and P_V representing projections of a 3D point
   */
  private addBasic3DPointSetup(cmd: Command, world: World): void {
    const planes = world.getAllProjectionPlanes();
    const P_H = planes.find((p) => p.name === 'P_H');
    const P_V = planes.find((p) => p.name === 'P_V');

    if (!P_H || !P_V) {
      throw new Error('Standard projection planes P_H and P_V not found');
    }

    // Create projection on P_H
    const p_h_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_H.id!,
      new Vector3(300, 50, 1)
    ));
    const p_h_id = p_h_result.outputs.pointId as string;
    this.createdElementIds.push(p_h_id);

    // Set label
    const p_h = P_H.getPoint(p_h_id);
    if (p_h) {
      p_h.label = 'A_H';
    }

    // Create projection on P_V (same x-coordinate)
    const p_v_result = cmd.addAndExecute(new AddFreePoint2DOp(
      P_V.id!,
      new Vector3(300, 100, 1)
    ));
    const p_v_id = p_v_result.outputs.pointId as string;
    this.createdElementIds.push(p_v_id);

    // Set label
    const p_v = P_V.getPoint(p_v_id);
    if (p_v) {
      p_v.label = 'A_V';
    }
  }
}
