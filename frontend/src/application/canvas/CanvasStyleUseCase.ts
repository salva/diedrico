import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import type { StyleUpdateRequest, ToolCommandResult } from '@/application/tools/ToolCommandIntents';

export class CanvasStyleUseCase {
  constructor(private readonly world: World, private readonly commandStack: CommandStack) {}

  update(request: StyleUpdateRequest): ToolCommandResult {
    const cmd = new Command(`Update style: ${request.elementId}`, this.world);
    try {
      cmd.addAndExecute(new UpdateElementStyleOp(request.elementId, request.planeId, request.style) as any);
      cmd.commit();
      this.commandStack.push(cmd);
      return { success: true };
    } catch (error) {
      cmd.rollback();
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
}
