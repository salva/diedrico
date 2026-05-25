import type { Vector3 } from 'three';
import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import type { MoveFreePointRequest, FreePointMoveSession, ToolCommandResult } from '@/application/tools/ToolCommandIntents';

export class CanvasPointMovementUseCase {
  constructor(private readonly world: World, private readonly commandStack: CommandStack) {}

  start(request: MoveFreePointRequest): FreePointMoveSession {
    const cmd = new Command(`Move point ${request.label ?? request.pointId}`, this.world);
    let hasPreview = false;

    return {
      preview: (position: Vector3): ToolCommandResult => {
        try {
          cmd.rollback();
          cmd.addAndExecute(new UpdateFreePoint2DPositionOp(request.planeId, request.pointId, position));
          hasPreview = true;
          return { success: true };
        } catch (error) {
          cmd.rollback();
          return { success: false, message: error instanceof Error ? error.message : String(error) };
        }
      },
      commit: (): ToolCommandResult => {
        if (!hasPreview) {
          cmd.rollback();
          return { success: true };
        }
        cmd.commit();
        this.commandStack.push(cmd);
        return { success: true };
      },
      cancel: (): void => {
        cmd.rollback();
      }
    };
  }
}
