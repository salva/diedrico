import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import type { ToolCommandExecutionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { StyleUpdateRequest, ToolCommandResult } from '@/tools/ToolCommandIntents';

export class CanvasStyleUseCase {
  constructor(private readonly commands: ToolCommandExecutionPort) {}

  update(request: StyleUpdateRequest): ToolCommandResult {
    return this.commands.executeToolCommand(`Update style: ${request.elementId}`, (command) => {
      command.addAndExecute(new UpdateElementStyleOp(request.elementId, request.planeId, request.style));
    });
  }
}
