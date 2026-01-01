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
 * - Creates Guide2DPerpendicularToLine with reference line ID and through-point ID
 * - Records action in process tree for parametric behavior
 * - Supports undo/redo via Command Pattern
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/spec.md - US3 Create Guide
 * - specs/001-dihedral-learning-mvp/data-model.md - Guide2D
 */

import { Command } from './Command';
import { World } from '@/domain/world/World';
import { Guide2DPerpendicularToLine } from '@/domain/world/Guide';
import { AddElementOp } from './operations/WorldOperations';
import type { Action } from '@/domain/processTree/Action';

export class CreateGuideCommand extends Command {
  private guideId: string;

  constructor(
    private referenceLineId: string,
    private throughPointId: string,
    private planeId: string,
    private world: World
  ) {
    super();
    this.guideId = world.generateGuideId();
  }

  execute(): void {
    // Create guide entity
    const guide = new Guide2DPerpendicularToLine(
      this.guideId,
      this.referenceLineId,
      this.throughPointId,
      this.planeId
    );

    // Record action in process tree
    const action: Action = {
      id: `action-${Date.now()}`,
      type: 'construct-guide',
      inputs: [this.referenceLineId, this.throughPointId],
      outputs: [this.guideId],
      timestamp: Date.now(),
    };

    // Compose operation
    const op = new AddElementOp(guide, action, this.world);
    this.operations.push(op);

    // Commit operation
    this.commit();
  }

  getGuideId(): string {
    return this.guideId;
  }

  getDescription(): string {
    return `Create guide perpendicular to ${this.referenceLineId} through ${this.throughPointId}`;
  }
}
