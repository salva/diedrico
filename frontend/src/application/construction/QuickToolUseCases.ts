import type { QuickToolIntent, ToolCommandResult } from '@/application/tools/ToolCommandIntents';

export interface ExecuteQuickToolParams {
  intent: QuickToolIntent;
}

export function executeQuickToolIntent({ intent }: ExecuteQuickToolParams): ToolCommandResult {
  return {
    success: false,
    message: `${intent.type} was removed from the active canvas tool registry in Wave 006a as example/debug construction flow`
  };
}
