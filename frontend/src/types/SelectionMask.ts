/**
 * SelectionMask.ts - Type definitions for tool-specific selection filtering
 * 
 * Each tool defines which element types are valid for selection at each step.
 * This mask filters both hit testing and hover highlighting.
 * 
 * Reference: ui-spec.md §Selection Mask System
 */

/**
 * Element types that can be included in selection masks.
 * These map to domain entity types that tools can interact with.
 */
export type SelectableElementType = 
  | 'point'           // Any Point2D (free, intersection, on-element)
  | 'line'            // Any Line2D (including half-hinge lines)
  | 'half-hinge-line' // Specifically HalfHingeLine2D only
  | 'segment'         // Any Segment2D
  | 'circle'          // Any Circle2D
  | 'guide';          // Any Guide2D

/**
 * Selection mask: array of element types valid for current tool step.
 * Empty array = nothing selectable (e.g., during preview)
 */
export type SelectionMask = SelectableElementType[];
