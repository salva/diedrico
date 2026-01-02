/**
 * CreateSegmentCommand - Create a finite line segment between two points
 * 
 * A segment is a finite portion of a line between two endpoints.
 * Unlike infinite lines, segments have specific start and end points.
 * 
 * Implementation:
 * - Requires two existing point IDs
 * - Creates segment with unique ID using World factory method
 * - Records action in process tree for parametric behavior
 * - Supports undo/redo via Command Pattern
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Segment Entity
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { AddSegment2DByPointsOp } from './operations/AddSegmentOp';

export class CreateSegmentCommand extends Command {
  private segmentId!: string;

  constructor(
    private point1Id: string,
    private point2Id: string,
    private planeId: string,
    world: World
  ) {
    super(`Create segment between points`, world);
  }

  execute(): void {
    // Add operation - it executes immediately and is stored for undo
    const op = new AddSegment2DByPointsOp(this.planeId, this.point1Id, this.point2Id);
    this.addAndExecute(op);
    
    // Get the generated ID from operation outputs
    this.segmentId = op.outputs.segmentId;

    // Record action in process tree
    const action = createSegmentAction(
      this.segmentId,
      this.planeId,
      this.point1Id,
      this.point2Id
    );

    this.world.getProcessTree().addAction(action);
  }

  getSegmentId(): string {
    return this.segmentId;
  }

  getDescription(): string {
    return `Create segment between points ${this.point1Id} and ${this.point2Id}`;
  }
}
