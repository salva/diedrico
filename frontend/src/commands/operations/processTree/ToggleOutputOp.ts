/**
 * ToggleOutputOp - Toggle "isOutput" status of a node
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';

export class ToggleOutputOp implements IOperation {
  readonly type = 'ToggleOutput';
  parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(private readonly nodeId: string) {
    this.parameters = { nodeId };
  }

  apply(world: World): OperationResult {
    const processTree = world.getProcessTree();
    try {
      console.log(`[ToggleOutputOp.apply] nodeId: ${this.nodeId}`);
      processTree.toggleOutput(this.nodeId);
      return { success: true, outputs: this.outputs };
    } catch (e: any) {
      return { success: false, outputs: {}, error: e.message };
    }
  }

  undo(world: World): void {
    const processTree = world.getProcessTree();
    processTree.toggleOutput(this.nodeId);
  }

  redo(world: World): void {
    const processTree = world.getProcessTree();
    console.log(`[ToggleOutputOp.redo] nodeId: ${this.nodeId}`);
    processTree.toggleOutput(this.nodeId);
  }

  serialize() {
    return { opType: this.type, nodeId: this.parameters.nodeId };
  }
}
