import type { Vector3 } from 'three';

export type ConstructionIntentType =
  | 'point'
  | 'line'
  | 'segment'
  | 'circle'
  | 'circle-by-radius'
  | 'guide'
  | 'intersection'
  | 'parallel-line'
  | 'perpendicular-line'
  | 'line-with-angle'
  | 'tangent-line-to-circle-through-point'
  | 'tangent-line-to-circle-parallel'
  | 'create3dpoint'
  | 'create3dpoint-by-coordinates'
  | 'create3dline'
  | 'create3dsegment'
  | 'create3dplane'
  | 'createprojectionplane'
  | 'create-yz-projection-plane';

export type ToolConstructionIntent =
  | { type: 'point'; planeId: string; position: Vector3; description: string }
  | { type: 'line'; planeId: string; point1Id: string; point2Id: string; description: string }
  | { type: 'circle'; planeId: string; centerPointId: string; circumferencePointId: string; description: string }
  | { type: 'circle-by-radius'; planeId: string; centerPointId: string; radiusVector: Vector3; description: string }
  | { type: 'segment'; planeId: string; point1Id: string; point2Id: string; description: string }
  | { type: 'guide'; planeId: string; referenceLineId: string; throughPointId: string; description: string }
  | { type: 'parallel-line'; planeId: string; referenceLineId: string; throughPointId: string; description: string }
  | { type: 'perpendicular-line'; planeId: string; referenceLineId: string; throughPointId: string; description: string }
  | { type: 'line-with-angle'; planeId: string; referenceLineId: string; throughPointId: string; angleRadians: number; description: string }
  | { type: 'intersection'; planeId: string; element1Id: string; element2Id: string; selectionPoint: Vector3; description: string }
  | { type: 'tangent-line-to-circle-through-point'; planeId: string; circleId: string; throughPointId: string; tangentIndex: 0 | 1; selectionPoint: Vector3; description: string }
  | { type: 'tangent-line-to-circle-parallel'; planeId: string; circleId: string; referenceLineId: string; tangentIndex: 0 | 1; selectionPoint: Vector3; description: string }
  | { type: 'create3dpoint'; projection1PointId: string; projection2PointId: string; description: string }
  | { type: 'create3dpoint-by-coordinates'; coordinates: Vector3; description: string }
  | { type: 'create3dline'; projection1LineId: string; projection2LineId: string; description: string }
  | { type: 'create3dsegment'; projection1SegmentId: string; projection2SegmentId: string; description: string }
  | { type: 'create3dplane'; trace1LineId: string; trace2LineId: string; description: string }
  | { type: 'createprojectionplane'; t1HingeTraceLineId: string; t2OtherTraceLineId: string; t2PrimePositionLineId: string; description: string }
  | { type: 'create-yz-projection-plane'; description: string };

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

export type ParameterUpdateRequest =
  | { elementId: string; planeId: string; parameter: { kind: 'radius'; value: number } }
  | { elementId: string; planeId: string; parameter: { kind: 'angle'; degrees: number } };

export interface ElementPropertiesRequest {
  elementId: string;
  planeId: string;
  position?: Vector3;
  parameter?: ParameterUpdateRequest['parameter'];
  style?: StyleUpdateRequest['style'];
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
  updateElementProperties(request: ElementPropertiesRequest): ToolCommandResult;
  updateElementParameter(request: ParameterUpdateRequest): ToolCommandResult;
}
