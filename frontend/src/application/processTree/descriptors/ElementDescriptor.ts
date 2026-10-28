/**
 * Phase 98: Dynamic Action Descriptions - Descriptor Pattern
 * 
 * ElementDescriptor interface defines how elements are described in the Process Tree.
 * Like CSS selectors separate style from structure, descriptors separate presentation from geometry.
 */

import type { Element } from '@/domain/world/Element';
import type { World } from '@/domain/world/World';
import type { DescriptionPart } from './DescriptionPart';

/**
 * Descriptor interface - defines presentation logic for an element type
 * 
 * Each element class has a corresponding descriptor that knows how to:
 * 1. Get the user-friendly type name
 * 2. Generate construction description parts
 * 
 * This keeps presentation logic separate from domain (geometry) logic.
 */
export interface ElementDescriptor<T extends Element = Element> {
  /**
   * Get user-friendly element type name
   * 
   * Examples: 'Point', 'Line', 'Circle', 'Segment', 'Guide', 'Projection Plane'
   * 
   * @param element The element instance
   * @returns User-friendly type name
   */
  getTypeName(element: T): string;
  
  /**
   * Generate construction description parts for this element
   * 
   * Returns array of text and label parts that describe how the element was constructed.
   * Examples:
   * - FreePoint2D: [{ type: 'text', content: 'Free point' }]
   * - LineLineIntersectionPoint2D: [
   *     { type: 'text', content: 'Intersection of line ' },
   *     { type: 'label', content: 'L_1', elementId: 'line2d1' },
   *     { type: 'text', content: ' and line ' },
   *     { type: 'label', content: 'L_2', elementId: 'line2d2' }
   *   ]
   * 
   * @param element The element to describe
   * @param world World instance for parent label lookup
   * @returns Array of text and label parts describing construction
   */
  getConstructionDescription(element: T, world: World): DescriptionPart[];
}
