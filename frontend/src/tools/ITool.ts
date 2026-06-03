import type { Matrix3, Vector3 } from 'three';
import type { ToolCommandSink } from './ToolCommandIntents';
import type { ToolInteractionReadPort } from './ToolInteractionReadPort';
import type { SelectionMask } from '@/types/SelectionMask';

export interface ToolInteractionQueryContext {
  viewport: { zoom: number; panX: number; panY: number };
  paperToPlaneTransform?: Matrix3;
  activePlaneId?: string;
}

export interface ToolInteractionHit {
  elementId: string;
  elementType: string;
  primitiveId: string;
  distance: number;
  snapPoint: Vector3;
}

export interface ToolInteractionQuery {
  hitTest(
    canvasPos: Vector3,
    snapRadiusPixels: number,
    context: ToolInteractionQueryContext,
    selectionMask?: SelectionMask,
  ): ToolInteractionHit | null;
}

/**
 * Tool execution context supplied by the canvas interaction controller.
 */
export interface ToolContext {
  planeId: string;
  planeCoords: Vector3;
  canvasCoords: { x: number; y: number };
  commandSink: ToolCommandSink;
  readPort: ToolInteractionReadPort;
  interactionQuery: ToolInteractionQuery;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  completeTool?: () => void;
}

export interface ToolResult {
  success: boolean;
  message?: string;
}

/**
 * Base interface for geometric construction tools.
 */
export interface ITool {
  readonly name: string;
  handleClick(context: ToolContext): ToolResult;
  activate?(context: ToolContext): void;
  deactivate?(context: ToolContext): void;
  cancel?(): void;
  getState?(): Record<string, unknown>;
  getSelectionMask?(): SelectionMask | undefined;
}

export type CanvasTool = ITool;
