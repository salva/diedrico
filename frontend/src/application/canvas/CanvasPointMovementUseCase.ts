import type { Vector3 } from 'three';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import type { PreviewCommandSessionFactory } from '@/application/commandProduction/CommandProductionPorts';
import type { MoveFreePointRequest, FreePointMoveSession, ToolCommandResult } from '@/application/tools/ToolCommandIntents';

export class CanvasPointMovementUseCase {
  constructor(private readonly commandSessions: PreviewCommandSessionFactory) {}

  start(request: MoveFreePointRequest): FreePointMoveSession {
    const session = this.commandSessions.startPreviewCommand(`Move point ${request.label ?? request.pointId}`);

    return {
      preview: (position: Vector3): ToolCommandResult => session.preview((command) => {
        command.addAndExecute(new UpdateFreePoint2DPositionOp(request.planeId, request.pointId, position));
      }),
      commit: (): ToolCommandResult => session.commit(),
      cancel: (): void => {
        session.cancel();
      }
    };
  }
}
