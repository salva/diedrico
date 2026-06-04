import type { Vector3 } from 'three';
import type { ArgumentValue } from '@/tools/ToolArgumentCollector';

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

export type TangentChoiceMetadata = {
  tangentIndex: 0 | 1;
  selectionPoint: Vector3;
};

export type IntersectionChoiceMetadata = {
  selectionPoint: Vector3;
};

export type ToolConstructionMetadata = TangentChoiceMetadata | IntersectionChoiceMetadata;

export type MetadataConstructionIntentType =
  | 'intersection'
  | 'tangent-line-to-circle-through-point'
  | 'tangent-line-to-circle-parallel';

export type BasicConstructionIntentType = Exclude<ConstructionIntentType, MetadataConstructionIntentType>;

interface BaseToolConstructionIntent {
  description: string;
  planeId: string;
  args: Map<string, ArgumentValue>;
}

export type ToolConstructionIntent =
  | (BaseToolConstructionIntent & { type: BasicConstructionIntentType; metadata?: undefined })
  | (BaseToolConstructionIntent & { type: 'intersection'; metadata: IntersectionChoiceMetadata })
  | (BaseToolConstructionIntent & { type: 'tangent-line-to-circle-through-point'; metadata: TangentChoiceMetadata })
  | (BaseToolConstructionIntent & { type: 'tangent-line-to-circle-parallel'; metadata: TangentChoiceMetadata });

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
  startFreePointMove(request: MoveFreePointRequest): FreePointMoveSession;
  updateElementStyle(request: StyleUpdateRequest): ToolCommandResult;
}
