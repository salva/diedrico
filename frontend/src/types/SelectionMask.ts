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
 * 
 * Type Hierarchy:
 * - 'line': Specifically regular lines (Line2DByTwoPoints, Line2DParallel, Line2DPerpendicular)
 *   EXCLUDES subtypes like segments, guides, half-hinge-lines
 * - 'any-line': ANY element extending Line2D class
 *   INCLUDES lines, segments, guides, and half-hinge-lines
 */
export type SelectableElementType = 
  | 'point'           // Any Point2D (free, intersection, on-element)
  | 'line'            // Regular lines only (excludes segments/guides/half-hinge-lines)
  | 'any-line'        // ANY Line2D subclass (lines + segments + guides + half-hinge-lines)
  | 'half-hinge-line' // Specifically HalfHingeLine2D only
  | 'segment'         // Specifically Segment2DByPoints only
  | 'circle'          // Any Circle2D
  | 'guide';          // Specifically Guide2D/SiblingGuide2D only

/**
 * Selection mask: array of element types valid for current tool step.
 * Empty array = nothing selectable (e.g., during preview)
 */
export type SelectionMask = SelectableElementType[];
