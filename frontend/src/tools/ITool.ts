/**
 * ITool - Interface for geometric construction tools.
 *
 * Tools collect interaction arguments and emit typed application intents.
 * Application controllers own command creation, validation orchestration,
 * commit/rollback, and command-stack execution.
 */

import type { Vector3 } from 'three';
import type { World } from '@/domain/world/World';
import type { Paper } from '@/domain/presentation/Paper';
import type { SelectionMask } from '@/types/SelectionMask';
import type { useToolStore } from '@/stores/toolStore';
import type { ToolCommandSink } from '@/application/tools/ToolCommandIntents';

/**
 * Context provided to tools when handling user input.
 */
export interface ToolContext {
  planeId: string;
  planeCoords: Vector3;
  canvasCoords: { x: number; y: number };
  commandSink: ToolCommandSink;
  world: World;
  paper: Paper;
  paperToPlaneTransform: any;
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
