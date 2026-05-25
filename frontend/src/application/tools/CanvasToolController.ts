import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type { useToolStore } from '@/stores/toolStore';
import type { ToolCommandSink, ToolConstructionIntent, QuickToolIntent, MoveFreePointRequest, FreePointMoveSession, StyleUpdateRequest, ToolCommandResult } from './ToolCommandIntents';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { executeQuickToolIntent } from '@/application/construction/QuickToolUseCases';
import { CanvasPointMovementUseCase } from '@/application/canvas/CanvasPointMovementUseCase';
import { CanvasStyleUseCase } from '@/application/canvas/CanvasStyleUseCase';

export interface CanvasToolControllerDependencies {
  world: World;
  commandStack: CommandStack;
  toolStore: ReturnType<typeof useToolStore>;
}

export interface CanvasToolControllerProviderDependencies {
  world: World;
  commandStack: unknown;
  toolStore: ReturnType<typeof useToolStore>;
}

export function createCanvasToolController(deps: CanvasToolControllerProviderDependencies): CanvasToolController {
  if (!deps.commandStack) {
    throw new Error('CommandStack not provided');
  }
  return new CanvasToolController({
    world: deps.world,
    commandStack: deps.commandStack as CommandStack,
    toolStore: deps.toolStore
  });
}

export class CanvasToolController implements ToolCommandSink {
  private readonly movement: CanvasPointMovementUseCase;
  private readonly style: CanvasStyleUseCase;

  constructor(private readonly deps: CanvasToolControllerDependencies) {
    this.movement = new CanvasPointMovementUseCase(deps.world, deps.commandStack);
    this.style = new CanvasStyleUseCase(deps.world, deps.commandStack);
  }

  executeConstructionIntent(intent: ToolConstructionIntent): ToolCommandResult {
    const result = executeConstructionIntent({
      intent,
      world: this.deps.world,
      commandStack: this.deps.commandStack
    });
    return result;
  }

  executeQuickIntent(intent: QuickToolIntent): ToolCommandResult {
    const result = executeQuickToolIntent({
      intent,
      world: this.deps.world,
      commandStack: this.deps.commandStack
    });
    this.deps.toolStore.setTool('select');
    return result;
  }

  startFreePointMove(request: MoveFreePointRequest): FreePointMoveSession {
    return this.movement.start(request);
  }

  updateElementStyle(request: StyleUpdateRequest): ToolCommandResult {
    return this.style.update(request);
  }
}
