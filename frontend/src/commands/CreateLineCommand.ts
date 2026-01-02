/**
 * CreateLineCommand - Command for creating a line through two points
 * 
 * Creates a Line2DByTwoPoints from two existing points on a projection plane.
 * Uses World factory method for type-safe creation with built-in validation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import { AddLine2DByTwoPointsOp } from './operations/AddLineOp';

export class CreateLineCommand extends Command {
  private point1Id: string;
  private point2Id: string;
  private planeId: string;
  private lineId?: string;  // Set after execution

  constructor(point1Id: string, point2Id: string, planeId: string, world: World) {
    super(`Create line on ${planeId}`, world);
    this.point1Id = point1Id;
    this.point2Id = point2Id;
    this.planeId = planeId;
  }

  /**
   * Execute the command using addAndExecute pattern
   */
  execute(): void {
    // Add operation - it executes immediately and is stored for undo
    const op = new AddLine2DByTwoPointsOp(this.planeId, this.point1Id, this.point2Id);
    this.addAndExecute(op);
    
    // Get the generated ID from operation outputs
    this.lineId = op.outputs.lineId;

    // Create action for process tree
    const action = createLineAction(this.lineId!, this.planeId, this.point1Id, this.point2Id);
    
    // Record action in process tree
    this.world.getProcessTree().addAction(action);
  }

  /**
   * Get the ID of the created line (available after execute())
   */
  getLineId(): string | undefined {
    return this.lineId;
  }
}
