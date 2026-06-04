import type { ProcessNodeType } from '@/domain/processTree/ProcessTree';
import type { VisualStyle } from '@/domain/world/VisualStyle';

export interface NodeVisibility {
  showIntermediates?: boolean;
  isOutput?: boolean;
  isAuxiliary?: boolean;
  defaultStyle?: VisualStyle;
}

export class VisibilityModel {
  private readonly nodeVisibility = new Map<string, NodeVisibility>();

  get(nodeId: string, nodeType: ProcessNodeType): NodeVisibility {
    return { ...this.defaultsForType(nodeType), ...this.nodeVisibility.get(nodeId) };
  }

  setShowIntermediates(subprocessId: string, value: boolean): void {
    this.getOrCreate(subprocessId).showIntermediates = value;
  }

  toggleOutput(nodeId: string, nodeType: ProcessNodeType): void {
    const current = this.get(nodeId, nodeType);
    this.getOrCreate(nodeId).isOutput = !current.isOutput;
  }

  setAuxiliary(groupId: string, value: boolean): void {
    this.getOrCreate(groupId).isAuxiliary = value;
  }

  setDefaultStyle(nodeId: string, style: VisualStyle | undefined): void {
    this.getOrCreate(nodeId).defaultStyle = style;
  }

  clear(): void {
    this.nodeVisibility.clear();
  }

  private defaultsForType(nodeType: ProcessNodeType): NodeVisibility {
    switch (nodeType) {
      case 'subprocess':
        return { showIntermediates: true, isOutput: true };
      case 'actionGroup':
        return { isOutput: true, isAuxiliary: false };
      case 'action':
        return { isOutput: true };
    }
  }

  private getOrCreate(nodeId: string): NodeVisibility {
    let entry = this.nodeVisibility.get(nodeId);
    if (!entry) {
      entry = {};
      this.nodeVisibility.set(nodeId, entry);
    }
    return entry;
  }
}
