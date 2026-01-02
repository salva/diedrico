/**
 * AddGuide2DPerpendicularToLineOp - Operation to add a Guide2DPerpendicularToLine using World factory method
 * 
 * Wraps World.addGuide2D() in the Operation interface.
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

export class AddGuide2DPerpendicularToLineOp implements IOperation {
  readonly type = 'AddGuide2DPerpendicularToLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private planeId: string,
    private referenceLineId: string,
    private throughPointId: string
  ) {
    this.parameters = { planeId, referenceLineId, throughPointId };
  }

  apply(world: World): OperationResult {
    try {
      // Pass stored ID if available (for redo), otherwise let World generate new one
      const guide = world.addGuide2D(
        this.planeId,
        this.referenceLineId,
        this.throughPointId,
        this.outputs.guideId
      );
      this.outputs = { guideId: guide.id };
      return {
        success: true,
        outputs: this.outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(world: World): void {
    if (this.outputs.guideId) {
      world.removeGuide2D(this.planeId, this.outputs.guideId);
    }
  }
}
