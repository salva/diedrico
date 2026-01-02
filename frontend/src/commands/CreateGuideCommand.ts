/**
 * CreateGuideCommand - Create a guide perpendicular to a reference line through a point
 * 
 * Guides are special construction lines used in dihedral geometry for transporting
 * points and distances between projection planes.
 * 
 * Workflow:
 * 1. User selects a reference line (hinge line or BHL projection)
 * 2. User selects or clicks a point on the active plane
 * 3. Guide is created perpendicular to the reference line, passing through the point
 * 4. Guide appears on both planes associated with the reference line
 * 
 * Implementation:
 * - Creates Guide2DPerpendicularToLine using World factory method
 * - Records action in process tree for parametric behavior
 * - Supports undo/redo via Command Pattern
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/spec.md - US3 Create Guide
 * - specs/001-dihedral-learning-mvp/data-model.md - Guide2D
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import { AddGuide2DPerpendicularToLineOp } from './operations/AddGuideOp';

export class CreateGuideCommand extends Command {
  private guideId!: string;

  constructor(
    private referenceLineId: string,
    private throughPointId: string,
    private planeId: string,
    world: World
  ) {
    super(`Create guide perpendicular to line`, world);
  }

  execute(): void {
    // Add operation - it executes immediately and is stored for undo
    const op = new AddGuide2DPerpendicularToLineOp(this.planeId, this.referenceLineId, this.throughPointId);
    this.addAndExecute(op);
    
    // Get the generated ID from operation outputs
    this.guideId = op.outputs.guideId;

    // Record action in process tree
    const action = createGuideAction(
      this.guideId,
      this.planeId,
      this.referenceLineId,
      this.throughPointId
    );

    this.world.getProcessTree().addAction(action);
  }

  getGuideId(): string {
    return this.guideId;
  }

  getDescription(): string {
    return `Create guide perpendicular to ${this.referenceLineId} through ${this.throughPointId}`;
  }
}
