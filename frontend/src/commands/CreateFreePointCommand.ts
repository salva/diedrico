/**
 * CreateFreePointCommand - Command for creating a free point
 * 
 * Creates a FreePoint2D at the specified position on a projection plane.
 * Uses World factory method for type-safe creation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US1
 */

import { Vector3 } from 'three';
import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';
import { AddFreePoint2DOp } from './operations/AddFreePointOp';

export class CreateFreePointCommand extends Command {
  private planePos: Vector3;
  private planeId: string;
  private pointId?: string;  // Set after execution

  constructor(planePos: Vector3, planeId: string, world: World) {
    super(`Create free point on ${planeId}`, world);
    this.planePos = planePos;
    this.planeId = planeId;
  }

  /**
   * Execute the command using addAndExecute pattern
   */
  execute(): void {
    // Add operation - it executes immediately and is stored for undo
    const op = new AddFreePoint2DOp(this.planeId, this.planePos);
    this.addAndExecute(op);
    
    // Get the generated ID from operation outputs
    this.pointId = op.outputs.pointId;

    // Create action for process tree
    const action = createPointAction(this.pointId!, this.planeId, this.planePos);
    
    // Record action in process tree
    this.world.getProcessTree().addAction(action);
  }

  /**
   * Get the ID of the created point (available after execute())
   */
  getPointId(): string | undefined {
    return this.pointId;
  }
}
