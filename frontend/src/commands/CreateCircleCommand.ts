/**
 * CreateCircleCommand - Create a circle from center point and radius
 * 
 * Circles can be defined by:
 * - Center point + explicit radius value (most common for MVP)
 * - Center point + point on circumference (radius computed)
 * - Three points on circumference (future enhancement)
 * 
 * For MVP, we implement the center + radius workflow:
 * 1. User selects center point
 * 2. User clicks to specify radius or enters value
 * 3. Circle is created and recorded in process tree
 * 
 * Implementation:
 * - Creates Circle2DByCenterAndRadius with center point ID and radius
 * - Records action in process tree for parametric behavior
 * - Supports undo/redo via Command Pattern
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - US2 Create Circles
 */

import { Command } from './Command';
import { World } from '@/domain/world/World';
import { Circle2DByCenterAndRadius } from '@/domain/world/Circle';
import { AddElementOp } from './operations/WorldOperations';
import type { Action } from '@/domain/processTree/Action';

export class CreateCircleCommand extends Command {
  private circleId: string;

  constructor(
    private centerPointId: string,
    private radius: number,
    private planeId: string,
    private world: World
  ) {
    super();
    this.circleId = world.generateCircleId();
  }

  execute(): void {
    // Validate radius is positive
    if (this.radius <= 0) {
      throw new Error(`Invalid radius: ${this.radius}. Radius must be positive.`);
    }

    // Create circle entity
    const circle = new Circle2DByCenterAndRadius(
      this.circleId,
      this.centerPointId,
      this.radius,
      this.planeId
    );

    // Record action in process tree
    const action: Action = {
      id: `action-${Date.now()}`,
      type: 'construct-circle',
      inputs: [this.centerPointId],
      outputs: [this.circleId],
      timestamp: Date.now(),
    };

    // Compose operation
    const op = new AddElementOp(circle, action, this.world);
    this.operations.push(op);

    // Commit operation
    this.commit();
  }

  getCircleId(): string {
    return this.circleId;
  }

  getDescription(): string {
    return `Create circle with center ${this.centerPointId} and radius ${this.radius}`;
  }
}
