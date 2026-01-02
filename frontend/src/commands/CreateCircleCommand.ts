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
 * - Creates Circle2DByCenterAndRadius using World factory method
 * - Records action in process tree for parametric behavior
 * - Supports undo/redo via Command Pattern
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - US2 Create Circles
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { createCircleAction } from '@/domain/processTree/actions/CreateCircleAction';
import { AddCircle2DByCenterAndRadiusOp } from './operations/AddCircleOp';

export class CreateCircleCommand extends Command {
  private circleId!: string;

  constructor(
    private centerPointId: string,
    private radius: number,
    private planeId: string,
    world: World
  ) {
    super(`Create circle with center and radius`, world);
  }

  execute(): void {
    // Add operation - it executes immediately and is stored for undo
    const op = new AddCircle2DByCenterAndRadiusOp(this.planeId, this.centerPointId, this.radius);
    this.addAndExecute(op);
    
    // Get the generated ID from operation outputs
    this.circleId = op.outputs.circleId;

    // Record action in process tree
    const action = createCircleAction(
      this.circleId,
      this.planeId,
      this.centerPointId,
      this.radius
    );

    this.world.getProcessTree().addAction(action);
  }

  getCircleId(): string {
    return this.circleId;
  }

  getDescription(): string {
    return `Create circle with center ${this.centerPointId} and radius ${this.radius}`;
  }
}
