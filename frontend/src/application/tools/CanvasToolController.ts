import type { CanvasCommandProductionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { World } from '@/domain/world/World';
import type { ToolCommandSink, ToolConstructionIntent, QuickToolIntent, MoveFreePointRequest, FreePointMoveSession, StyleUpdateRequest, ToolCommandResult } from './ToolCommandIntents';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { executeQuickToolIntent } from '@/application/construction/QuickToolUseCases';
import { CanvasPointMovementUseCase } from '@/application/canvas/CanvasPointMovementUseCase';
import { CanvasStyleUseCase } from '@/application/canvas/CanvasStyleUseCase';

export interface CanvasToolControllerToolStore {
  setTool(tool: 'select'): void;
}

export interface CanvasToolControllerDependencies {
  world: World;
  commands: CanvasCommandProductionPort;
  toolStore: CanvasToolControllerToolStore;
}

export class CanvasToolController implements ToolCommandSink {
  private readonly movement: CanvasPointMovementUseCase;
  private readonly style: CanvasStyleUseCase;

  constructor(private readonly deps: CanvasToolControllerDependencies) {
    this.movement = new CanvasPointMovementUseCase(deps.commands);
    this.style = new CanvasStyleUseCase(deps.commands);
  }

  executeConstructionIntent(intent: ToolConstructionIntent): ToolCommandResult {
    return executeConstructionIntent({
      intent,
      world: this.deps.world,
      commands: this.deps.commands
    });
  }

  executeQuickIntent(intent: QuickToolIntent): ToolCommandResult {
    const result = executeQuickToolIntent({ intent });
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
