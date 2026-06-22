/**
 * Abstract base class for all geometric elements.
 *
 * Every element has a stable ID, an optional display label, optional visual
 * style, cloning semantics, and dependency declarations for graph tracking.
 */

import type { VisualStyle } from './VisualStyle';

export abstract class Element {
  /** Unique identifier for this element */
  readonly id: string;
  
  /** Optional user-assigned label for UI display */
  label?: string;
  
  /** Visual styling properties: color, line width, line style, visibility, and opacity. */
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
