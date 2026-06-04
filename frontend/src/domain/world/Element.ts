/**
 * Element - Abstract base class for ALL geometric elements (2D and 3D)
 * 
 * This is the root of the element hierarchy:
 *   Element
 *   ├── Element3D (Point3D, Line3D, Segment3D, Plane3D, HingeLine)
 *   └── Element2D (Point2D, Line2D, Circle2D)
 * 
 * **Phase 52**: Introduced to eliminate code duplication and enable uniform handling
 * of geometric elements across dimensions.
 * 
 * **Phase 83**: Added visualStyle property for unified styling across all elements.
 * 
 * **Design Principle: DRY (Don't Repeat Yourself)**
 * - id, label, and visualStyle are common to ALL geometric elements
 * - Extracted to base class to avoid duplication
 * - Enables uniform handling across dimensions
 * 
 * **Benefits**:
 * - **DRY Principle**: Common properties defined once in base class
 * - **Uniform Interface**: Can write functions accepting Element to work with any geometric object
 * - **Type Safety**: isElement() type guard works for all elements
 * - **Consistent Property Names**: Enforce `label` instead of `name` across all elements
 * - **Unified Styling**: All elements have consistent visual configuration through visualStyle
 * 
 */

import type { VisualStyle } from './VisualStyle';

export abstract class Element {
  /** Unique identifier for this element */
  readonly id: string;
  
  /** Optional user-assigned label for UI display */
  label?: string;
  
  /** Visual styling properties (color, lineWidth, lineStyle, visibility, opacity) - Phase 83 */
  visualStyle?: VisualStyle;
  
  /**
   * Construct a geometric element
   * 
   * @param id Element ID (format varies by dimension)
   *           - For 2D elements: hierarchical format '{planeId}/{localId}' (enforced by validateElementId in Element2D constructor)
   *           - For 3D elements: simple ID (e.g., 'plane_1', 'hinge_h_v')
   * @param label Optional user-friendly label for UI display
   * @param visualStyle Optional visual styling (color, lineWidth, etc.) - inherits from subprocess if unset
   */
  constructor(id: string, label?: string, visualStyle?: VisualStyle) {
    this.id = id;
    this.label = label;
    this.visualStyle = visualStyle;
  }
  
  /**
   * Clone this element
   * Must be implemented by concrete subclasses
   */
  abstract clone(): Element;

  /**
   * Get the IDs of elements this element depends on.
   * This is used by DependencyService to build the dependency graph.
   * 
   * @returns Array of dependency IDs
   */
  abstract getDependencies(): string[];
}

/**
 * Type guard to check if an object is an Element
 * 
 * @param obj Object to check
 * @returns true if obj is an Element (2D or 3D), false otherwise
 */
export function isElement(obj: any): obj is Element {
  return obj instanceof Element;
}
