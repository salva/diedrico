import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type { QuickToolIntent, ToolCommandResult } from '@/application/tools/ToolCommandIntents';

export interface ExecuteQuickToolParams {
  intent: QuickToolIntent;
  world: World;
  commandStack: CommandStack;
}

export function executeQuickToolIntent({ intent }: ExecuteQuickToolParams): ToolCommandResult {
  return {
    success: false,
    message: `${intent.type} was removed from the active canvas tool registry in Wave 006a as example/debug construction flow`
  };
}
