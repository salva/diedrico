/**
 * ITool - Interface for geometric construction tools.
 *
 * Tools collect interaction arguments and emit typed application intents.
 * Application controllers own command creation, validation orchestration,
 * commit/rollback, and command-stack execution.
 */

import type { Matrix3, Vector3 } from 'three';
import type { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import type { SelectionMask } from '@/types/SelectionMask';
import type { useToolStore } from '@/stores/toolStore';
import type { ToolCommandSink } from '@/application/tools/ToolCommandIntents';
import type { ToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';

/**
 * Context provided to tools when handling user input.
 */
export interface ToolContext {
  planeId: string;
  planeCoords: Vector3;
  canvasCoords: { x: number; y: number };
  commandSink: ToolCommandSink;
  readPort: ToolInteractionReadPort;
  interactionQuery: CanvasInteractionQuery;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  toolStore: ReturnType<typeof useToolStore>;
}

/**
 * Result of a tool operation
 */
export interface ToolResult {
  success: boolean;
  message?: string;
}

/**
 * Base interface for all tools.
 */
export interface ITool {
  readonly name: string;
  handleClick(context: ToolContext): ToolResult;
  activate?(context: ToolContext): void;
  deactivate?(context: ToolContext): void;
  cancel?(): void;
  getState?(): Record<string, any>;
  getSelectionMask?(): SelectionMask | undefined;
}
