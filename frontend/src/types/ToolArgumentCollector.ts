/**
 * ToolArgumentCollector.ts - Framework interfaces for multi-argument tool construction (Phase 64)
 * 
 * Provides declarative interfaces for tools that collect multiple geometric arguments
 * (e.g., CircleTool needs center + circumference point, TangentLineTool needs circle + point OR circle + line).
 * 
 * Key Features:
 * - Any-order collection: Arguments can be selected in any sequence
 * - Mutually exclusive sets: Support multiple construction methods (e.g., tangent via circle+point OR circle+line)
 * - Dynamic selection masks: Automatically computed as union of viable next arguments
 * - Automatic UI feedback: Status messages generated based on viable sets and collected arguments
 * - Three-layer validation: Type (via SelectionMask), argument-level (per spec), set-level (cross-argument)
 * 
 */

import type { SelectionMask } from './SelectionMask';
import type { Element2D } from '@/domain/world/Element2D';
import type { World } from '@/domain/world/World';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { Vector3 } from 'three';

/**
 * Value of a collected argument: element + position where user clicked
 * 
 * For tools with SelectionMask.none():
 * - element is null (nothing selected)
 * - planeCoords contains free position where user clicked (e.g., PointTool creates free point)
 * 
 * For tools with tangent lines:
 * - element is the circle/line selected
 * - planeCoords determines index (angle-based) via mouse position
 * 
 * This structure ensures every argument captures complete "what happened" record.
 */
export interface ArgumentValue {
  /** Selected element (null if SelectionMask.none() used) */
  element: Element2D | null;
  
  /** Position in plane coordinates where user clicked */
  planeCoords: Vector3;
}

/**
 * Declarative specification for a single argument in a tool's argument set
 * 
 * Example:
 * ```typescript
 * { 
 *   name: 'center', 
 *   mask: SelectionMask.point(),
 *   validator: (element, context) => {
 *     // Optional: Check if element is suitable
 *     return { valid: true };
 *   }
 * }
 * ```
 */
export interface ToolArgumentSpec {
  /**
   * Semantic name for this argument (e.g., 'center', 'referenceCircle', 'throughPoint')
   * Used as key in collected arguments map and in status messages
   */
  name: string;
  
  /**
   * Selection mask defining which element types are acceptable
   * Framework uses this for CanvasInteractionQuery filtering and computing next viable selections
   */
  mask: SelectionMask;
  
  /**
   * Optional argument-level validator
   * Called after type checking (SelectionMask) but before set-level validation
   * 
   * Use cases:
   * - Check geometric constraints (e.g., "point must be outside circle")
   * - Validate element properties (e.g., "line must not be vertical")
   * - Cross-reference with already-collected arguments
   * 
   * @param element - The element being validated
   * @param context - Current collection context (world, plane, collected arguments)
   * @returns Validation result with optional error message
   */
  validator?: (element: Element2D, context: CollectionContext) => ValidationResult;
}

/**
 * Declarative specification for a complete argument set (one construction method)
 * 
 * Tools with multiple construction methods define multiple ToolArgumentSets.
 * Example: TangentLineTool might have two sets:
 * - Set 1: [{ name: 'circle', mask: circle() }, { name: 'throughPoint', mask: point() }]
 * - Set 2: [{ name: 'circle', mask: circle() }, { name: 'referenceLine', mask: anyLine() }]
 * 
 * Framework tracks which sets are still viable as arguments are collected.
 */
export interface ToolArgumentSet {
  /**
   * Array of argument specifications for this construction method
   * Order doesn't matter - framework supports any-order collection
   */
  arguments: ToolArgumentSpec[];
  
  /**
   * Optional human-readable label for this construction method
   * Used in UI feedback when multiple sets are viable
   * Example: "Tangent through point" vs "Tangent parallel to line"
   */
  label?: string;
  
  /**
   * Optional set-level validator
   * Called when all arguments in set are collected, before execution
   * 
   * Use cases:
   * - Cross-argument validation (e.g., "point must be outside circle")
   * - Geometric feasibility (e.g., "circle and line must not intersect")
   * 
   * @param args - Map of collected arguments (name → {element, planeCoords})
   * @param context - Current collection context (world, plane, collected arguments)
   * @returns Validation result with optional error message
   */
  setValidator?: (args: Map<string, import('../tools/ArgumentCollectorTool').ArgumentValue>, context: CollectionContext) => ValidationResult;  
  /**
   * Optional execution callback for this specific argument set
   * 
   * If provided, this callback is invoked when this set is completed.
   * If not provided, falls back to tool's execute() method (which receives setIndex).
   * 
   * Use cases:
   * - Multi-method tools: Each construction method has its own execution logic
   * - Cleaner code: Avoids if/switch on setIndex in tool's execute() method
   * 
   * Example:
   * ```typescript
   * {
   *   arguments: [{ name: 'circle', mask: circle() }, { name: 'point', mask: point() }],
   *   execute: (args, context) => {
   *     const circle = args.get('circle')!.element as Circle2D;
   *     const point = args.get('point')!.element as Point2D;
   *     // Create tangent through point...
   *   }
   * }
   * ```
   * 
   * @param args - Map of collected arguments (name → {element, planeCoords})
   * @param context - Tool execution context (world, commandStack, planeId, etc.)
   * @returns Tool result (success/failure message)
   */
  execute?: (args: Map<string, ArgumentValue>, context: import('../tools/ITool').ToolContext) => import('../tools/ITool').ToolResult;}

/**
 * Context provided to validators during argument collection
 * Gives validators access to world state and already-collected arguments
 */
export interface CollectionContext {
  /**
   * World instance for accessing geometric data
   */
  world: World;
  
  /**
   * Current projection plane where tool is operating
   */
  plane: ProjectionPlane;
  
  /**
   * Arguments collected so far (name → {element, planeCoords})
   * Validators can reference previously collected arguments for cross-validation
   * Access element via: collected.get('argName')?.element
   * Access position via: collected.get('argName')?.planeCoords
   */
  collected: Map<string, ArgumentValue>;
}

/**
 * Result from argument or set validation
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;
  
  /**
   * Optional error message if validation failed
   * Displayed to user in tool status message
   */
  error?: string;
}
