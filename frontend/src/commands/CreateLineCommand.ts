/**
 * CreateLineCommand - Command for creating a line through two points
 * 
 * Creates a Line2DByTwoPoints from two existing points on a projection plane.
 * Composed from AddElementOp operation.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2
 */

import { Command } from './Command';
import { AddElementOp } from './operations/WorldOperations';
import type { World } from '@/domain/world/World';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';

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
   * Execute the command by composing AddElementOp
   */
  execute(): void {
    // Validate that points exist and are on the same plane
    const point1 = this.world.getPointById(this.point1Id);
    const point2 = this.world.getPointById(this.point2Id);
    
    if (!point1) {
      throw new Error(`Point ${this.point1Id} not found`);
    }
    if (!point2) {
      throw new Error(`Point ${this.point2Id} not found`);
    }
    if (point1.planeId !== this.planeId || point2.planeId !== this.planeId) {
      throw new Error(`Points must be on plane ${this.planeId}`);
    }
    
    // Generate unique line ID
    this.lineId = this.world.generateLineId();
    
    // Create element data for the line
    const elementData = {
      id: this.lineId,
      type: 'by-two-points',  // Line2DByTwoPoints
      point1Id: this.point1Id,
      point2Id: this.point2Id,
      planeId: this.planeId,
      label: undefined  // No label by default
    };
    
    // Create and execute AddElementOp
    const operation = new AddElementOp('line', elementData);
    const result = this.addAndExecute(operation);
    
    if (!result.success) {
      throw new Error(`Failed to create line: ${result.error}`);
    }
    
    // Record action in process tree
    const action = createLineAction(this.lineId, this.planeId, this.point1Id, this.point2Id);
    this.world.getProcessTree().addAction(action);
  }

  /**
   * Get the ID of the created line (available after execute())
   */
  getLineId(): string | undefined {
    return this.lineId;
  }
}
