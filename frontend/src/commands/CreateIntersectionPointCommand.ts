/**
 * CreateIntersectionPointCommand - Command to create intersection point between two lines
 * 
 * Creates an IntersectionPoint2D at the intersection of two lines.
 * Follows Command Pattern for undo/redo support.
 * Records construction in process tree for dependency tracking.
 * Uses World factory method with built-in parallel line validation.
 * 
 * Validation:
 * - Both lines must exist (checked by factory method)
 * - Lines must not be parallel (checked by factory method)
 * 
 * @see specs/001-dihedral-learning-mvp/plan.md#intersection-points
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-14-line-line-intersections
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { createIntersectionPointAction } from '@/domain/processTree/actions/CreateIntersectionPointAction';
import { AddIntersectionPoint2DOp } from './operations/AddIntersectionPointOp';

export interface CreateIntersectionPointCommandParams {
  line1Id: string;
  line2Id: string;
  planeId: string;
  label?: string;
}

export class CreateIntersectionPointCommand extends Command {
  private pointId!: string;
  private params: CreateIntersectionPointCommandParams;

  constructor(
    world: World,
    params: CreateIntersectionPointCommandParams
  ) {
    super(`Create intersection point between lines`, world);
    this.params = params;
  }

  execute(): void {
    // Add operation - it executes immediately and is stored for undo
    const op = new AddIntersectionPoint2DOp(
      this.params.planeId,
      this.params.line1Id,
      this.params.line2Id,
      0 // index: line-line intersection has single point
    );
    this.addAndExecute(op);
    
    // Get the generated ID from operation outputs
    this.pointId = op.outputs.pointId;

    // Record action in process tree
    const action = createIntersectionPointAction(
      this.pointId,
      this.params.planeId,
      this.params.line1Id,
      this.params.line2Id,
      0 // index: line-line intersection has single point
    );

    this.world.getProcessTree().addAction(action);
    
    // T055j: Sibling point ProcessTree recording
    // Decision: Sibling points are NOT recorded as separate actions.
    // Rationale: Siblings are automatically derived (like 3D projections) and their
    // dependencies are implicit through the primary point. If the primary is deleted,
    // the sibling is automatically removed via World.removePoint2D().
    // The primary action already captures all inputs (line1, line2), which fully
    // determines both the primary and sibling positions.
  }

  getPointId(): string {
    return this.pointId;
  }

  getDescription(): string {
    return `Create intersection point between ${this.params.line1Id} and ${this.params.line2Id}`;
  }
}
