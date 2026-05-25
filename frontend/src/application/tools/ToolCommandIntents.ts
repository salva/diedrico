import type { Vector3 } from 'three';
import type { ArgumentValue } from '@/types/ToolArgumentCollector';

export type ConstructionIntentType =
  | 'point'
  | 'line'
  | 'segment'
  | 'circle'
  | 'guide'
  | 'intersection'
  | 'parallel-line'
  | 'perpendicular-line'
  | 'tangent-line-to-circle-through-point'
  | 'tangent-line-to-circle-parallel'
  | 'create3dpoint'
  | 'create3dline'
  | 'create3dsegment'
  | 'create3dplane'
  | 'createprojectionplane'
  | 'interactiveprojectionsetup';

export type QuickToolIntentType =
  | 'quickprojectionsetup'
  | 'quick3dline'
  | 'quick3dsegment';

export type TangentChoiceMetadata = {
  tangentIndex: 0 | 1;
  selectionPoint: Vector3;
};

export type IntersectionChoiceMetadata = {
  selectionPoint: Vector3;
};

interface BaseToolConstructionIntent {
  type: ConstructionIntentType;
  description: string;
  planeId: string;
  args: Map<string, ArgumentValue>;
}

export type ToolConstructionIntent =
  | (BaseToolConstructionIntent & {
      type: 'tangent-line-to-circle-through-point' | 'tangent-line-to-circle-parallel';
      metadata: TangentChoiceMetadata;
    })
  | (BaseToolConstructionIntent & {
      type: 'intersection';
      metadata: IntersectionChoiceMetadata;
    })
  | (BaseToolConstructionIntent & {
      type: Exclude<ConstructionIntentType, 'tangent-line-to-circle-through-point' | 'tangent-line-to-circle-parallel' | 'intersection'>;
      metadata?: never;
    });

export interface QuickToolIntent {
  type: QuickToolIntentType;
  description: string;
}

export interface MoveFreePointRequest {
  planeId: string;
  pointId: string;
  label?: string;
}

export interface StyleUpdateRequest {
  elementId: string;
  planeId: string;
  style: {
    color?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    opacity?: number;
    visible?: boolean;
  };
}

export interface ToolCommandResult {
  success: boolean;
  message?: string;
}

export interface FreePointMoveSession {
  preview(position: Vector3): ToolCommandResult;
  commit(): ToolCommandResult;
  cancel(): void;
}

export interface ToolCommandSink {
  executeConstructionIntent(intent: ToolConstructionIntent): ToolCommandResult;
  executeQuickIntent(intent: QuickToolIntent): ToolCommandResult;
  startFreePointMove(request: MoveFreePointRequest): FreePointMoveSession;
  updateElementStyle(request: StyleUpdateRequest): ToolCommandResult;
}
