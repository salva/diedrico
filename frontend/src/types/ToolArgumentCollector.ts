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
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { Vector3 } from 'three';
import type { ToolInteractionReadPort } from '@/tools/ToolInteractionReadPort';

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
   * Optional argument-level validator.
   * Called after type checking (SelectionMask) but before set-level validation.
   * Validators can use the bounded readPort for geometric reads and realizations.
   */
  validator?: (element: Element2D, context: CollectionContext) => ValidationResult;
}

/**
 * Declarative specification for a complete argument set (one construction method)
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
   * Optional set-level validator.
   * Called when all arguments in set are collected, before execution.
   * Validators can use the bounded readPort for geometric reads and realizations.
   */
  setValidator?: (args: Map<string, import('../tools/ArgumentCollectorTool').ArgumentValue>, context: CollectionContext) => ValidationResult;
  
  /**
   * Optional execution callback for this specific argument set
   */
  execute?: (args: Map<string, ArgumentValue>, context: import('../tools/ITool').ToolContext) => import('../tools/ITool').ToolResult;
}

/**
 * Context provided to validators during argument collection.
 * Exposes the current plane, collected arguments, and bounded tool read capabilities.
 */
export interface CollectionContext {
  /**
   * Behavior-sized read and realization capabilities for active tool validation.
   */
  readPort: ToolInteractionReadPort;
  
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

  /** Optional non-blocking warning for validators that can report soft geometry concerns. */
  warning?: string;
}
