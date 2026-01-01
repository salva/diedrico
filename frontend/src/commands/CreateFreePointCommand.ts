/**
 * CreateFreePointCommand - Command for creating a free point
 * 
 * Creates a FreePoint2D at the specified position on a projection plane.
 * Composed from AddElementOp operation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US1
 */

import { Vector3 } from 'three';
import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import type { World } from '@/domain/world/World';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';

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
   * Execute the command by composing AddElementOp
   */
  execute(): void {
    // Generate unique point ID
    this.pointId = this.world.generatePointId();
    
    // Create element data for the point
    const elementData = {
      id: this.pointId,
      type: 'free',
      position: {
        x: this.planePos.x,
        y: this.planePos.y,
        z: this.planePos.z
      },
      planeId: this.planeId,
      label: undefined  // No label by default
    };
    
    // Create and execute AddElementOp
    const operation = new AddElementOp('point', elementData);
    const result = this.addAndExecute(operation);
    
    if (!result.success) {
      throw new Error(`Failed to create point: ${result.error}`);
    }
    
    // Record action in process tree
    const action = createPointAction(this.pointId, this.planeId, this.planePos);
    this.world.getProcessTree().addAction(action);
    
    // Trigger World reactivity
    // Note: World should have a version counter that increments on mutations
    // For now, we rely on the operation to handle this
  }

  /**
   * Get the ID of the created point (available after execute())
   */
  getPointId(): string | undefined {
    return this.pointId;
  }
}
