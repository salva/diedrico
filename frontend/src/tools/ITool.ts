import type { Matrix3, Vector3 } from 'three';
import type { ToolCommandSink } from './ToolCommandIntents';
import type { ToolInteractionReadPort } from './ToolInteractionReadPort';
import type { SelectionMask } from '@/types/SelectionMask';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from '@/types/ToolArgumentInput';

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
  cancel?(): void;
  getState?(): Record<string, unknown>;
  getSelectionMask?(): SelectionMask | undefined;
}

export interface PlanePositionInputCapableTool extends ITool {
  handlePlanePositionInput(context: ToolContext, position: Vector3): ToolResult;
  acceptsPlanePositionInput(): boolean;
  getPlanePositionInputLabel(): string;
}

export interface ToolArgumentInputCapableTool extends ITool {
  getToolArgumentInputRequest(): ToolArgumentInputRequest | null;
  handleToolArgumentInput(context: ToolContext, input: ParsedToolArgumentInput): ToolResult;
}

export function supportsPlanePositionInput(tool: ITool | null | undefined): tool is PlanePositionInputCapableTool {
  if (!tool) return false;
  const candidate = tool as Partial<PlanePositionInputCapableTool>;
  return typeof candidate.handlePlanePositionInput === 'function'
    && typeof candidate.acceptsPlanePositionInput === 'function'
    && typeof candidate.getPlanePositionInputLabel === 'function';
}

export function supportsToolArgumentInput(tool: ITool | null | undefined): tool is ToolArgumentInputCapableTool {
  if (!tool) return false;
  const candidate = tool as Partial<ToolArgumentInputCapableTool>;
  return typeof candidate.getToolArgumentInputRequest === 'function'
    && typeof candidate.handleToolArgumentInput === 'function';
}

export type CanvasTool = ITool;
