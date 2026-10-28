import type { CanvasCommandProductionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { OperationContext } from '@/commands/operations/OperationContext';
import type { ToolCommandSink, ToolConstructionIntent, MoveFreePointRequest, FreePointMoveSession, StyleUpdateRequest, ToolCommandResult, ParameterUpdateRequest } from '@/tools/ToolCommandIntents';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { CanvasPointMovementUseCase } from '@/application/canvas/CanvasPointMovementUseCase';
import { CanvasStyleUseCase } from '@/application/canvas/CanvasStyleUseCase';
import { Circle2DByCenterAndRadiusVector } from '@/domain/world/Circle';
import { Line2DByPointAndRelativeAngle } from '@/domain/world/Line';
import { MIN_PARAMETER_RADIUS } from '@/domain/world/GeometricParameters';
import { UpdateCircle2DRadiusVectorOp } from '@/commands/operations/world/AddCircleOp';
import { UpdateLine2DRelativeAngleOp } from '@/commands/operations/world/AddLineOp';

import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import type { CommandOperationBuilder } from '@/application/commandProduction/CommandProductionPorts';
import type { ElementPropertiesRequest } from '@/tools/ToolCommandIntents';

export interface CanvasToolControllerDependencies {
  operationContext: OperationContext;
  commands: CanvasCommandProductionPort;
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
      operationContext: this.deps.operationContext,
      commands: this.deps.commands,
    });
  }

  startFreePointMove(request: MoveFreePointRequest): FreePointMoveSession {
    return this.movement.start(request);
  }

  updateElementStyle(request: StyleUpdateRequest): ToolCommandResult {
    return this.style.update(request);
  }

  updateElementParameter(request: ParameterUpdateRequest): ToolCommandResult {
    return this.deps.commands.executeToolCommand('Update element parameter', command => this.buildParameterUpdate(command, request));
  }

  /** One confirmation owns geometry, style and their rollback in one command. */
  updateElementProperties(request: ElementPropertiesRequest): ToolCommandResult {
    if (!request.position && !request.parameter && !request.style) return { success: true };
    return this.deps.commands.executeToolCommand('Update element properties', command => {
      if (request.position) command.addAndExecute(new UpdateFreePoint2DPositionOp(request.planeId, request.elementId, request.position));
      if (request.parameter) this.buildParameterUpdate(command, { ...request, parameter: request.parameter });
      if (request.style) command.addAndExecute(new UpdateElementStyleOp(request.elementId, request.planeId, request.style));
    });
  }

  private buildParameterUpdate(command: CommandOperationBuilder, request: { elementId: string; planeId: string; parameter: ParameterUpdateRequest['parameter'] }): void {
      const plane = this.deps.operationContext.world.getProjectionPlaneById(request.planeId);
      if (!plane) throw new Error(`Plane not found: ${request.planeId}`);

      if (request.parameter.kind === 'radius') {
        if (!Number.isFinite(request.parameter.value) || request.parameter.value < MIN_PARAMETER_RADIUS) {
          throw new Error(`Radius must be at least ${MIN_PARAMETER_RADIUS}.`);
        }
        const circle = plane.getCircle(request.elementId);
        if (!(circle instanceof Circle2DByCenterAndRadiusVector)) {
          throw new Error('Selected circle does not have an editable radius parameter.');
        }
        const direction = circle.radiusVector.clone().normalize();
        command.addAndExecute(new UpdateCircle2DRadiusVectorOp(
          request.planeId,
          request.elementId,
          direction.multiplyScalar(request.parameter.value),
        ));
        return;
      }

      const line = plane.getLine(request.elementId);
      if (!(line instanceof Line2DByPointAndRelativeAngle)) {
        throw new Error('Selected line does not have an editable angle parameter.');
      }
      command.addAndExecute(new UpdateLine2DRelativeAngleOp(
        request.planeId,
        request.elementId,
        request.parameter.degrees * Math.PI / 180,
      ));
  }
}
