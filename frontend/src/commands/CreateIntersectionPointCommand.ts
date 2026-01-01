/**
 * CreateIntersectionPointCommand - Command to create intersection point between two lines
 * 
 * Creates an IntersectionPoint2D at the intersection of two lines.
 * Follows Command Pattern for undo/redo support.
 * Records construction in process tree for dependency tracking.
 * 
 * Validation:
 * - Both lines must exist
 * - Lines must not be parallel (checked at tool level, not here)
 * 
 * @see specs/001-dihedral-learning-mvp/plan.md#intersection-points
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-14-line-line-intersections
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { IntersectionPoint2D } from '@/domain/world/Point';
import { AddElementOp } from './operations/WorldOperations';
import type { Action } from '@/domain/processTree/Action';

export interface CreateIntersectionPointCommandParams {
  line1Id: string;
  line2Id: string;
  planeId: string;
  label?: string;
}

export class CreateIntersectionPointCommand extends Command {
  private pointId: string;
  private params: CreateIntersectionPointCommandParams;

  constructor(
    world: World,
    params: CreateIntersectionPointCommandParams
  ) {
    super(`Create intersection point between lines`, world);
    this.params = params;
    this.pointId = world.generatePointId();
  }

  execute(): void {
    // Create intersection point entity (index 0 - line-line has only one intersection)
    const point = new IntersectionPoint2D(
      this.pointId,
      this.params.line1Id,
      this.params.line2Id,
      0, // index: line-line intersection has single point
      this.params.planeId,
      this.params.label
    );

    // Record action in process tree
    const action: Action = {
      id: `action-${Date.now()}`,
      type: 'construct-intersection',
      inputs: [this.params.line1Id, this.params.line2Id],
      outputs: [this.pointId],
      timestamp: Date.now(),
    };

    // Compose operation
    const op = new AddElementOp(point, action, this.world);
    this.operations.push(op);

    // Commit operation
    this.commit();
  }

  getPointId(): string {
    return this.pointId;
  }

  getDescription(): string {
    return `Create intersection point between ${this.params.line1Id} and ${this.params.line2Id}`;
  }
}
