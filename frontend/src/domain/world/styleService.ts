/**
 * Style Service - Element Visibility Resolution
 * 
 * Phase 83: Element Visibility Property
 * 
 * Provides utility functions for resolving element visual properties,
 * particularly visibility with subprocess inheritance support.
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#phase-83-element-visibility-property
 */

import type { Element } from './Element';
import type { World } from './World';

/**
 * Resolve effective visibility for an element
 * 
 * Resolution order:
 * 1. Element's own visualStyle.visible (if set)
 * 2. Subprocess default style visibility (TODO: when subprocess styling implemented)
 * 3. Default to true (visible)
 * 
 * @param element - The element to check visibility for
 * @param world - World instance (for future subprocess inheritance lookup)
 * @returns true if element should be visible, false otherwise
 * 
 * @example
 * // Element with explicit visibility
 * const point = new FreePoint2D('p1', 'plane1', 0, 0, undefined, createVisualStyle({ visible: false }));
 * resolveVisibility(point, world); // false
 * 
 * @example
 * // Element with no visualStyle (defaults to visible)
 * const line = new LineFromTwoPoints('l1', 'plane1', 'p1', 'p2');
 * resolveVisibility(line, world); // true
 */
export function resolveVisibility(element: Element, _world: World): boolean {
  // Check element's own visualStyle
  if (element.visualStyle !== undefined) {
    return element.visualStyle.visible;
  }
  
  // TODO Phase 83: Add subprocess inheritance when subprocess styling is implemented
  // const subprocess = _world.getProcessTree().findSubprocessForElement(element.id);
  // if (subprocess?.defaultStyle?.visible !== undefined) {
  //   return subprocess.defaultStyle.visible;
  // }
  
  // Default to visible
  return true;
}
