/**
 * CreateSegmentCommand - Create a finite line segment between two points
 * 
 * A segment is a finite portion of a line between two endpoints.
 * Unlike infinite lines, segments have specific start and end points.
 * 
 * Implementation:
 * - Requires two existing point IDs
 * - Creates segment with unique ID
 * - Records action in process tree for parametric behavior
 * - Supports undo/redo via Command Pattern
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Segment Entity
 */

import { Command } from './Command';
import { World } from '@/domain/world/World';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { AddElementOp } from './operations/WorldOperations';
import type { Action } from '@/domain/processTree/Action';

export class CreateSegmentCommand extends Command {
  private segmentId: string;

  constructor(
    private point1Id: string,
    private point2Id: string,
    private planeId: string,
    private world: World
  ) {
    super();
    this.segmentId = world.generateSegmentId();
  }

  execute(): void {
    // Create segment entity
    const segment = new Segment2DByPoints(
      this.segmentId,
      this.point1Id,
      this.point2Id,
      this.planeId
    );

    // Record action in process tree
    const action: Action = {
      id: `action-${Date.now()}`,
      type: 'construct-segment',
      inputs: [this.point1Id, this.point2Id],
      outputs: [this.segmentId],
      timestamp: Date.now(),
    };

    // Compose operation
    const op = new AddElementOp(segment, action, this.world);
    this.operations.push(op);

    // Commit operation
    this.commit();
  }

  getSegmentId(): string {
    return this.segmentId;
  }

  getDescription(): string {
    return `Create segment between points ${this.point1Id} and ${this.point2Id}`;
  }
}
