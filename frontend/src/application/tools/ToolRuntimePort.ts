import type { Ref } from 'vue';
import type { ToolType } from './ToolTypes';

export interface ToolRuntimePort {
  readonly currentTool: Ref<ToolType>;
  setToolStepMessage(message: string): void;
}
